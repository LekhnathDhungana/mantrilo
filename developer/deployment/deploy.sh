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

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')"
API_URL="${API_URL:-https://mantrilo-api-$PROJECT_NUMBER.$REGION.run.app}"
CONSOLE_ORIGIN="${CONSOLE_ORIGIN:-https://mantrilo-console-$PROJECT_NUMBER.$REGION.run.app}"
TAG="$(git rev-parse --short HEAD)"

build() {
  gcp builds submit . --region "$REGION" --config developer/deployment/cloudbuild.yaml \
    --service-account "projects/$PROJECT/serviceAccounts/$BUILD_SA" \
    --substitutions "_DOCKERFILE=$2,_IMAGE=$1"
}

echo "== Building and deploying the API"
API_IMAGE="$REGION-docker.pkg.dev/$PROJECT/$REPO/api:$TAG"
build "$API_IMAGE" developer/deployment/api.Dockerfile
# Usage is written just after each response, so the CPU must stay on between requests.
gcp run deploy mantrilo-api --image "$API_IMAGE" --region "$REGION" \
  --service-account "$API_SA" --allow-unauthenticated --no-cpu-throttling \
  --memory 512Mi --min-instances 0 --max-instances 10 \
  --set-env-vars "FIREBASE_PROJECT_ID=$PROJECT,MANTRILO_MEDIA_BUCKET=$BUCKET"

echo "== Building and deploying the console"
CONSOLE_IMAGE="$REGION-docker.pkg.dev/$PROJECT/$REPO/console:$TAG"
build "$CONSOLE_IMAGE" developer/deployment/Dockerfile

ENV_VARS="FIREBASE_PROJECT_ID=$PROJECT,MANTRILO_APP_ORIGIN=$CONSOLE_ORIGIN,MANTRILO_API_URL=$API_URL"
ENV_VARS+=",MANTRILO_API_SIGNER=$CONSOLE_SA"
for name in FIREBASE_WEB_API_KEY FIREBASE_AUTH_DOMAIN FIREBASE_WEB_APP_ID \
  STRIPE_PRICE_STARTER STRIPE_PRICE_GROWTH STRIPE_PRICE_BUSINESS MANTRILO_EMAIL_FROM; do
  value="$(local_value "$name" || true)"
  [[ -z "$value" ]] || ENV_VARS+=",$name=$value"
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

gcp run deploy mantrilo-console --image "$CONSOLE_IMAGE" --region "$REGION" \
  --service-account "$CONSOLE_SA" --allow-unauthenticated \
  --memory 512Mi --min-instances 0 --max-instances 10 \
  --set-env-vars "$ENV_VARS" ${SECRETS:+--set-secrets "$SECRETS"}

echo "== Checking the API"
curl --fail --silent --show-error --max-time 30 "$API_URL/v1" >/dev/null
echo "API: $API_URL/v1"
echo "Console: $CONSOLE_ORIGIN"
echo "Add ${CONSOLE_ORIGIN#https://} to Firebase Authentication > Settings > Authorized domains."
