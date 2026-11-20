# Service providers and subprocessors

Draft for review. This register covers Mantrilo's website, Developer Console, and API. The final Data Processing Addendum schedule should identify the providers that process customer API data on Mantrilo's behalf and their contracted locations and terms.

| Provider | Service and information handled | Review before publication or contracting |
| --- | --- | --- |
| Google Cloud and Firebase | Hosting, authentication, database, object storage, and infrastructure logging. Account and session data, workspace records, request metadata, and API data in transit through hosted services | Confirm contracting entities, configured service locations, logging and backup retention, and the terms for each service. [Firebase privacy and security](https://firebase.google.com/support/privacy) · [Google Cloud Data Processing Addendum](https://cloud.google.com/terms/data-processing-addendum) |
| Stripe | Checkout, subscription billing, payment authentication, and fraud prevention. Workspace identifier, account email when available, and payment and billing details supplied through Stripe | Confirm the billing entity, support contact, and record-retention requirements. Stripe describes both processor and controller roles for different activities. [Stripe Data Processing Agreement](https://stripe.com/legal/dpa) |
| FreeAstroAPI | Upstream calculation and place search for operations routed to the provider. Inputs can include birth dates and times, time zones, coordinates, two birth profiles, or place queries | Confirm whether the provider can act as a subprocessor, permitted downstream use, processing locations, retention and deletion, and incident notification terms. [Provider terms](https://www.freeastroapi.com/terms) · [Mantrilo integration review](../FREEASTROAPI-FEASIBILITY.md) |
| Resend | Optional delivery of email sign-in codes when enabled. Recipient email and sign-in message | The current production Console configuration has no Resend key binding. Reconfirm before activating or publishing the processor list. [Resend Data Processing Addendum](https://resend.com/legal/dpa) |

[Confirm which providers handle support email or other data outside these application flows. Add a contact for notices and objections, and set the list's effective date.]
