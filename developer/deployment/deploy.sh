#!/usr/bin/env bash
# Deploys the public API and developer console to Cloud Run. Safe to run again.
# Usage: developer/deployment/deploy.sh
# With custom domains: API_URL=https://api.example.com CONSOLE_ORIGIN=https://app.example.com ...
set -euo pipefail

PROJECT=mantrilo
REGION=us-central1 # Next to the nam5 Firestore database.
REPO=mantrilo
BUCKET=mantrilo-media
API_SA="mantrilo-api@$PROJECT.iam.gserviceaccount.com"
CONSOLE_SA="mantrilo-console@$PROJECT.iam.gserviceaccount.com"
BUILD_SA="mantrilo-builder@$PROJECT.iam.gserviceaccount.com"

cd "$(git rev-parse --show-toplevel)"
ENV_FILE=developer/.env.local
gcp() { gcloud "$@" --project "$PROJECT" --quiet; }
local_value() { grep -E "^$1=" "$ENV_FILE" | head -1 | cut -d= -f2-; }

if [[ "$(gcloud billing projects describe "$PROJECT" --format='value(billingEnabled)')" != True ]]; then
  echo "Billing is off for project $PROJECT. Link a billing account, then run this again:"
  echo "https://console.cloud.google.com/billing/linkedaccount?project=$PROJECT"
  exit 1
fi

for name in FIREBASE_WEB_API_KEY FIREBASE_AUTH_DOMAIN FIREBASE_WEB_APP_ID; do
  [[ -n "$(local_value "$name")" ]] || { echo "$name is missing from $ENV_FILE."; exit 1; }
done

echo "== Enabling services"
gcp services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
  secretmanager.googleapis.com iamcredentials.googleapis.com

echo "== Preparing the image repository and service accounts"
gcp artifacts repositories describe "$REPO" --location "$REGION" >/dev/null 2>&1 ||
  gcp artifacts repositories create "$REPO" --location "$REGION" --repository-format docker

ensure_account() {
  gcp iam service-accounts describe "$1@$PROJECT.iam.gserviceaccount.com" >/dev/null 2>&1 ||
    gcp iam service-accounts create "$1" --display-name "$2"
}
project_role() {
  gcp projects add-iam-policy-binding "$PROJECT" --member "serviceAccount:$1" --role "$2" \
    --condition None >/dev/null
}
self_sign() {
  gcp iam service-accounts add-iam-policy-binding "$1" --member "serviceAccount:$1" \
    --role roles/iam.serviceAccountTokenCreator >/dev/null
}
ensure_account mantrilo-api "Mantrilo public API"
ensure_account mantrilo-console "Mantrilo developer console"
ensure_account mantrilo-builder "Mantrilo image builder"
project_role "$BUILD_SA" roles/cloudbuild.builds.builder
project_role "$API_SA" roles/datastore.user
project_role "$CONSOLE_SA" roles/datastore.user
project_role "$CONSOLE_SA" roles/firebaseauth.admin
self_sign "$API_SA"
self_sign "$CONSOLE_SA"
gcloud storage buckets add-iam-policy-binding "gs://$BUCKET" --quiet \
  --member "serviceAccount:$API_SA" --role roles/storage.objectViewer >/dev/null
gcloud storage buckets add-iam-policy-binding "gs://$BUCKET" --quiet \
  --member "serviceAccount:$CONSOLE_SA" --role roles/storage.objectViewer >/dev/null

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')"
API_URL="${API_URL:-https://mantrilo-api-$PROJECT_NUMBER.$REGION.run.app}"
CONSOLE_ORIGIN="${CONSOLE_ORIGIN:-https://mantrilo-console-$PROJECT_NUMBER.$REGION.run.app}"
TAG="$(git rev-parse --short HEAD)"

build() {
  gcp builds submit . --region "$REGION" --config developer/deployment/cloudbuild.yaml \
    --service-account "projects/$PROJECT/serviceAccounts/$BUILD_SA" \
    --substitutions "_DOCKERFILE=$2,_IMAGE=$1,_CONSOLE_BASE_PATH=${3:-}"
}

ASTROLOGY_SECRET=mantrilo-astrology-api-key
ASTROLOGY_BINDING=""
if gcp secrets describe "$ASTROLOGY_SECRET" >/dev/null 2>&1; then
  for account in "$API_SA" "$CONSOLE_SA"; do
    gcp secrets add-iam-policy-binding "$ASTROLOGY_SECRET" --member "serviceAccount:$account" \
      --role roles/secretmanager.secretAccessor >/dev/null
  done
  ASTROLOGY_BINDING="MANTRILO_ASTROLOGY_API_KEY=$ASTROLOGY_SECRET:latest"
fi

echo "== Building and deploying the API"
API_IMAGE="$REGION-docker.pkg.dev/$PROJECT/$REPO/api:$TAG"
build "$API_IMAGE" developer/deployment/api.Dockerfile
# Usage is written just after each response, so the CPU must stay on between requests.
gcp run deploy mantrilo-api --image "$API_IMAGE" --region "$REGION" \
  --service-account "$API_SA" --allow-unauthenticated --no-cpu-throttling \
  --memory 512Mi --min-instances 0 --max-instances 10 \
  --set-env-vars "FIREBASE_PROJECT_ID=$PROJECT,MANTRILO_MEDIA_BUCKET=$BUCKET,MANTRILO_BILLING_MODE=live" \
  ${ASTROLOGY_BINDING:+--update-secrets "$ASTROLOGY_BINDING"}

echo "== Building and deploying the console"
CONSOLE_IMAGE="$REGION-docker.pkg.dev/$PROJECT/$REPO/console:$TAG"
build "$CONSOLE_IMAGE" developer/deployment/Dockerfile

ENV_VARS="FIREBASE_PROJECT_ID=$PROJECT,MANTRILO_APP_ORIGIN=$CONSOLE_ORIGIN,MANTRILO_API_URL=$API_URL"
ENV_VARS+=",MANTRILO_API_SIGNER=$CONSOLE_SA"
for name in FIREBASE_WEB_API_KEY FIREBASE_AUTH_DOMAIN FIREBASE_WEB_APP_ID MANTRILO_EMAIL_FROM MANTRILO_GOOGLE_AUTH MANTRILO_APPLE_AUTH STRIPE_MANTRILO_PORTAL_CONFIGURATION STRIPE_STARTER_PROMOTION_ID STRIPE_GROWTH_PROMOTION_ID STRIPE_BUSINESS_PROMOTION_ID; do
  value="$(local_value "$name" || true)"
  [[ -z "$value" ]] || ENV_VARS+=",$name=$value"
done
# Production always bills in live mode. Local STRIPE_PRICE_* values are sandbox prices, so the
# live ones are read from STRIPE_LIVE_PRICE_* instead.
ENV_VARS+=",MANTRILO_BILLING_MODE=live"
# Annual prices (the _ANNUAL suffix) are optional; without them annual checkout is unavailable.
for plan in STARTER GROWTH BUSINESS STARTER_ANNUAL GROWTH_ANNUAL BUSINESS_ANNUAL; do
  value="$(local_value "STRIPE_LIVE_PRICE_$plan" || true)"
  [[ -z "$value" ]] || ENV_VARS+=",STRIPE_PRICE_$plan=$value"
done
for plan in STARTER GROWTH STARTER_ANNUAL GROWTH_ANNUAL; do
  value="$(local_value "STRIPE_LIVE_IN_PRICE_$plan" || true)"
  [[ -z "$value" ]] || ENV_VARS+=",STRIPE_IN_PRICE_$plan=$value"
done

# Secrets live in Secret Manager and are attached only once they exist.
SECRETS=""
attach_secret() {
  gcp secrets describe "$2" >/dev/null 2>&1 || return 0
  gcp secrets add-iam-policy-binding "$2" --member "serviceAccount:$CONSOLE_SA" \
    --role roles/secretmanager.secretAccessor >/dev/null
  SECRETS+="${SECRETS:+,}$1=$2:latest"
}
attach_secret STRIPE_SECRET_KEY stripe-secret-key
attach_secret STRIPE_WEBHOOK_SECRET stripe-webhook-secret
attach_secret RESEND_API_KEY resend-api-key
attach_secret MANTRILO_UNLIMITED_PROMO mantrilo-unlimited-promo
if [[ -n "$ASTROLOGY_BINDING" ]]; then
  SECRETS+="${SECRETS:+,}$ASTROLOGY_BINDING"
fi

gcp run deploy mantrilo-console --image "$CONSOLE_IMAGE" --region "$REGION" \
  --service-account "$CONSOLE_SA" --allow-unauthenticated \
  --memory 512Mi --min-instances 0 --max-instances 10 \
  --set-env-vars "$ENV_VARS" ${SECRETS:+--set-secrets "$SECRETS"}

# www.mantrilo.com/console and /blog are served by a second service, reached through a Firebase
# Hosting rewrite. Its image must be built for the /console path: without it the pages ask for
# /_expo/... instead of /console/_expo/..., those requests 404 and sign-in never loads.
# The new revision keeps the service's existing settings and only takes traffic once its
# login page and every asset it references load.
HOSTING_SERVICE=mantrilo-console-hosting
HOSTING_BASE_PATH=/console
if gcp run services describe "$HOSTING_SERVICE" --region "$REGION" >/dev/null 2>&1; then
  echo "== Building and deploying the console behind www.mantrilo.com$HOSTING_BASE_PATH"
  HOSTING_IMAGE="$REGION-docker.pkg.dev/$PROJECT/$REPO/console:$TAG-hosting"
  HOSTING_TAG="release-$TAG"
  build "$HOSTING_IMAGE" developer/deployment/Dockerfile "$HOSTING_BASE_PATH"
  # Sign-in buttons follow .env.local on both services, so the two consoles never disagree.
  HOSTING_ENV=""
  for name in MANTRILO_GOOGLE_AUTH MANTRILO_APPLE_AUTH; do
    value="$(local_value "$name" || true)"
    HOSTING_ENV+="${HOSTING_ENV:+,}$name=${value:-false}"
  done
  gcp run deploy "$HOSTING_SERVICE" --image "$HOSTING_IMAGE" --region "$REGION" \
    --no-traffic --tag "$HOSTING_TAG" --update-env-vars "$HOSTING_ENV"
  HOSTING_URL="$(gcp run services describe "$HOSTING_SERVICE" --region "$REGION" --format='value(status.url)')"
  CANDIDATE="${HOSTING_URL/https:\/\//https://$HOSTING_TAG---}"
  login="$(curl --fail --silent --show-error --max-time 30 "$CANDIDATE$HOSTING_BASE_PATH/login")"
  assets="$(grep -oE '(src|href)="[^"]+\.(js|css)"' <<<"$login" | sed -E 's/^(src|href)="//; s/"$//' | sort -u)"
  [[ -n "$assets" ]] || { echo "The new console login page references no scripts; traffic not moved."; exit 1; }
  while read -r asset; do
    [[ "$asset" == "$HOSTING_BASE_PATH/"* ]] || {
      echo "Console asset $asset is outside $HOSTING_BASE_PATH; traffic not moved."
      exit 1
    }
    curl --fail --silent --output /dev/null --max-time 30 "$CANDIDATE$asset" || {
      echo "Console asset $asset failed to load; traffic not moved."
      exit 1
    }
  done <<<"$assets"
  gcp run services update-traffic "$HOSTING_SERVICE" --region "$REGION" --to-tags "$HOSTING_TAG=100"
else
  echo "== Skipping $HOSTING_SERVICE: the service does not exist yet."
fi

echo "== Checking the API"
curl --fail --silent --show-error --max-time 30 "$API_URL/v1" >/dev/null
echo "API: $API_URL/v1"
echo "Console: $CONSOLE_ORIGIN"
echo "Add ${CONSOLE_ORIGIN#https://} to Firebase Authentication > Settings > Authorized domains."
