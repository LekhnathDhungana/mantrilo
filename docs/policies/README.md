# Mantrilo launch policies

Working drafts for the public website, Developer Console, and hosted API. Confirm the open decisions and have the resulting policy package reviewed for the markets where Mantrilo will sell before publishing.

| Draft | Where customers should see it |
| --- | --- |
| [Privacy Policy](privacy.md) | Public `/privacy`, Console signup and settings, and API documentation where developers submit end-user data |
| [Terms of Service](terms.md), including Acceptable Use | Public `/terms`, Console signup, and checkout |
| [Subscription, Cancellation and Refund Policy](billing.md) | Pricing, Console Billing, and checkout before payment |
| [Content License](content-license.md) | Public `/license`, plan descriptions, catalog records and applicable API documentation |
| [Data Processing Addendum](data-processing-addendum.md) | Customer agreements when developers send end-user personal data to the API |
| [Service provider register](subprocessors.md) | Linked from Privacy and attached as the applicable subprocessor schedule once provider terms are confirmed |

## Decisions for the operator

1. Confirm the legal seller and privacy operator, business address, monitored support and privacy contacts, launch countries, and whether individual consumers may subscribe. The Console already points billing customers to `hello@mantrilo.com`. Verify that inbox and decide whether it will also handle privacy and rights requests.
2. Approve the proposed billing rules. The deployed Console has no dedicated Stripe Portal configuration in its environment, so the current draft includes a support path. Configure and test self-service cancellation before publishing a policy that promises it. Verify plan changes, including INR plans, and the behavior of refunds and account deletion. [Stripe website checklist](https://docs.stripe.com/get-started/checklist/website)
3. Approve a retention schedule for authentication records, usage, infrastructure logs and backups, Stripe records, and support correspondence. An authentication code or session expiring does not establish when its stored record is purged. Check production settings and assign someone to handle access, correction, and deletion requests.
4. Confirm the upstream astrology provider's terms for API resale, downstream caching and display, and its handling of birth details and place queries. Ask for written terms covering Mantrilo's model and a data processing agreement where applicable. Confirm which operations are enabled and preserve any required geodata attribution. [FreeAstroAPI terms](https://www.freeastroapi.com/terms)
5. Record rights for each edition, transliteration, rendering, recording, and public preview. Decide on streaming, offline access, attribution, redistribution, territory, and use after cancellation before promising any of those rights. Review the public audio sample and modern book titles first. [U.S. Copyright Office guidance on derivative works](https://www.copyright.gov/circs/circ14.pdf)

## Before launch

- Check that account deletion invalidates API keys after cache expiry and removes active account records. Verify how cloud logs, backups, and Stripe records age out and how support handles accounts that cannot use self-service deletion. Verify any upstream processing separately.
- Link approved terms at signup and record the accepted version and timestamp for each account. Show renewal interval, currency, price, promotion expiry or conversion, and cancellation/refund terms before charging. Test checkout, cancellation, and refunds using Stripe's test environment, then compare the live Portal configuration. For covered U.S. consumer subscriptions, federal law also requires clear disclosure of material terms, express informed consent, and a simple way to stop recurring charges. [Stripe website checklist](https://docs.stripe.com/get-started/checklist/website) · [U.S. Restore Online Shoppers’ Confidence Act](https://www.govinfo.gov/content/pkg/USCODE-2024-title15/html/USCODE-2024-title15-chap110.htm)
- Review local requirements for India and the other confirmed markets. If GDPR applies and Mantrilo acts as a processor, complete the Article 28 agreement and its schedules. Assess notice and browser-storage requirements against the actual deployment, including referral attribution. India's DPDP Act and Rules have phased commencement dates. [GDPR, Articles 13 and 28](https://eur-lex.europa.eu/eli/reg/2016/679/oj) · [India's DPDP commencement notification](https://egazette.gov.in/WriteReadData/2025/267647.pdf) · [DPDP Rules](https://egazette.gov.in/WriteReadData/2025/267650.pdf)
- If shipping a native app through an app store, check the exact account and payment flows before submission. Apple requires in-app account deletion when the app supports account creation. Google Play applies an in-app path and a web request link when the app enables account creation, including a handoff to external signup. [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) · [Google Play account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en)

## Implementation references

- [Public contact form and policy placeholders](../../src/components/InfoPage.web.tsx), [referral tags](../../src/components/site/consoleSource.web.ts), and [aggregate referral reporting](../../developer/scripts/seo-signup-starts.mjs).
- [Console settings](../../developer/src/components/screens/Settings.web.tsx), [account and billing routes](../../developer/server/app.mjs), [workspace deletion](../../developer/server/store.mjs), [sessions](../../developer/server/firebase.mjs), and [Stripe checkout and Portal](../../developer/server/billing.mjs).
- [API usage and audio delivery](../../developer/api/README.md), [astrology operations and upstream requests](../../developer/server/astrology/service.mjs), [catalog response fields](../../developer/api/content.mjs), and [upstream feasibility review](../FREEASTROAPI-FEASIBILITY.md).

## Stripe verification for India pricing

Checkout already collects a billing address for the INR plans. A Radar rule can check the billing country provided at Checkout and the country of the card issuer. Use the billing country to enforce market eligibility. Requiring an India-issued card adds a separate eligibility condition and should be a deliberate pricing decision. Stripe handles recurring mandate setup for eligible cards. [Checkout Session reference](https://docs.stripe.com/api/checkout/sessions/create) · [Radar attributes](https://docs.stripe.com/radar/rules/supported-attributes) · [India recurring payments](https://docs.stripe.com/india-recurring-payments)

For self-service, confirm custom Radar rules are available on the shared Stripe account. Scope the rule to Mantrilo customers and the INR flow, using Stripe customer metadata and payment attributes. In the Stripe sandbox, test Indian and non-Indian billing addresses, missing country, the first subscription payment and renewals. Verify that existing allow rules do not skip the check, USD and other products remain outside its scope, and Mantrilo grants the plan after Stripe confirms the subscription. Then switch the Console from manual approval to self-service and update the billing and privacy policies. [Radar rule evaluation and metadata](https://docs.stripe.com/radar/rules/reference) · [Stripe subscription lifecycle](https://docs.stripe.com/billing/subscriptions/overview)
