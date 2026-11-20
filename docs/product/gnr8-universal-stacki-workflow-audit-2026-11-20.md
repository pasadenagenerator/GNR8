# Audit: universal GNR8 workflow with native Stacki

Date: 2026-11-20. Scope: existing source and configuration, the four prepared
sites, and the GitHub/Cloudflare state already observed in this rollout. This is
a read-only integration audit, not a live transaction or a claim that every
provider account has been independently inspected. No secrets are recorded here.

## Decision and result

The accepted product path is: an authorized GNR8 site opens unchanged upstream
Stacki 1.4.8 with Lumos; the user edits with its builder or native AI; native
autosave retains the draft; **Push to GitHub** saves source without publishing;
**Deploy to hosting** publishes through Cloudflare to the exact working domain.
New sites must reach that state through one reusable provisioning path, without
per-site setup in provider dashboards. Other services should operate through
GNR8's backend when the site actually needs them.

**Result: this path is not yet end-to-end automatic or hosted-verified.** The
local Stacki source and four publish credentials are prepared. The missing
provisioner, identity mapping, credentials, domain cutover and hosted acceptance
tests are release blockers. An account's initial authentication, credential
issuance, financial/legal setup or GitHub OAuth consent cannot be asserted to
happen silently inside unmodified Stacki. The achievable user-facing contract
is one-time organizational setup, then no provider-dashboard steps for routine
site creation, editing, GitHub save and Cloudflare publish.

## End-to-end path

| Step | Verified implementation | Current gap |
| --- | --- | --- |
| Site/source selection | GNR8 checks agency/client ownership and exact imported source lineage; native preparation can run in Inngest. | Preparation requires an already confirmed source and an entry in `GNR8_NATIVE_STUDIO_SITES`. Creating a new site does not create its hosted Stacki or binding automatically. |
| Install editor | Four local sites build with byte-for-byte upstream Stacki 1.4.8 and Lumos 1.0.4. New Ladja Žaba and Logatčan Studio Workers and private draft buckets exist. | No reusable hosted provisioner for repo, bucket, Studio Worker, public Worker, domains, secrets and Platform binding. Two new public Workers are placeholders. |
| Open and authenticate | GNR8 site page links to the bound Studio and checks its own publish permission. Stacki independently verifies GitHub login and repository write permission. | A GNR8 owner without matching GitHub access cannot edit. OAuth login/initial consent occurs at GitHub. The Platform branch and four launch bindings are not deployed. |
| Builder and AI | Upstream builder and AI panel are retained; local Lumos insertion and build were exercised. All four Studio Workers have `AI_BASE_URL` and `AI_MODEL`. | `AI_API_KEY` is absent; no hosted AI Apply test. The older GNR8 pilot's session and AI budget gates do not govern direct native AI calls. The previously accepted per-owner usage boundary is therefore unproven. |
| Draft and GitHub save | Native autosave and Push to GitHub are present in the local editor. The GitHub App is installed for all current/future account repositories. | Hosted draft recovery and Push to GitHub have not been tested. Ladja Žaba and Logatčan lack App private key/client secret and session/container secrets. CHS/ViroiDoc public Workers still auto-deploy on repository push, so Save and Publish are still coupled there. |
| Cloudflare publish | Four `PUBLISH_CLOUDFLARE_API_TOKEN` Worker secrets were verified by name/type/placement. Native direct-publish configuration passes local Wrangler dry runs. | Token permissions and actual publish result are untested. CHS/ViroiDoc native branches are not pushed; two new domains are not routed to their public Workers. The new public Workers are placeholders. No exact-host publish/rollback/retry acceptance exists. |
| Operations after publish | Existing GNR8 data, contact and billing modules cover some provider tasks. | Provider readiness is fragmented. Contact delivery, billing, registrar actions and background jobs are not a single automatic native Stacki lifecycle. |

The main site workspace points its Design tab at native Stacki, but the GNR8
command center still links to a separate Airship editor. That visible legacy
path conflicts with the decision that Stacki is the only editor. Other legacy
publication and Stacki session modules also remain in source; their routes
must be classified before removal so existing data and serving are preserved.

## Provider inventory

“Code present” is not a claim that the production account has the required
permission, billing state, webhook or secret. Only GitHub App installation and
the specific Cloudflare Worker facts above were observed in provider UIs during
this rollout.

| Provider | What exists | What still blocks unattended operation |
| --- | --- | --- |
| ChatGPT | Useful as the planning/review interface for GNR8 work. | It is not a background site runtime or a substitute for OpenAI API credentials. There is no native Stacki integration that can silently authorize ChatGPT account actions. |
| Codex | Local preparation and review have been performed with Codex; older GNR8 provider documents describe manual execution. | No general unattended Codex execution, approval or result-import path is proven for every site. Treat Codex work as an operator/development path until a bounded service workflow exists. |
| OpenAI | Platform has a gated OpenAI gateway and an older Airship key store; four native Studios have endpoint/model configuration. | Native Studios lack API keys and hosted AI tests. Platform's old pilot accounting does not establish per-owner limits for direct native Stacki. A shared key needs central budget, attribution and rotation before rollout. |
| GitHub | Private repos and native branches exist; the shared App and broad installation are in place. | New Studios lack private key/client secret. CHS/ViroiDoc branch cutover is pending. Repository write rights, not GNR8 ownership alone, authorize native editing. Hosted Push to GitHub is untested. |
| Vercel | Hosts GNR8 Platform/Worker and has separate GNR8 GitHub/Vercel publication and custom-domain code. | That legacy publication path requires separate per-site connection tokens and approvals; it is not native Cloudflare Publish. The two new working hosts still need exact-host migration from the current Vercel wildcard path. Production Vercel configuration was not rechecked in this audit. |
| Supabase | Holds GNR8 auth, ownership, artifacts, billing, connection and job state. | No durable universal Studio binding/provisioning record replaces `GNR8_NATIVE_STUDIO_SITES`; target migration and live readback across all relevant tables were not verified. |
| Inngest | Native-source preparation, standalone publication, template, render and domain jobs are registered. | No hosted Studio/Cloudflare resource provisioner is registered. Native preparation and standalone publication jobs currently use zero automatic retries; hosted run success was not verified. |
| Resend | GNR8 contact delivery and the older standalone contact handler can call Resend. | Sender/domain verification, per-site routing and live delivery were not verified. The existing standalone contact handler targets a Vercel runtime; the native Cloudflare site gateway serves static assets plus Studio, with no contact handler. |
| Stripe | Signed subscription webhook updates billing/entitlements. | Code inventory does not establish complete checkout, portal, plan changes, webhook configuration or live billing acceptance. Financial/account setup cannot be assumed silent. |
| Openprovider | Read-only inventory and sandbox probes exist. | The live DNS/registration execution gate explicitly blocks operations. Domain purchase, transfer and DNS mutation are not an unattended path. |
| Upstash | The older standalone contact handler uses Upstash Redis for claims/rate control. | Per-site endpoint/token and live readiness are not verified; the native Cloudflare gateway does not wire that contact runtime. |
| Cloudflare | Four Studio Workers, four separate publish-token secrets, two new private R2 buckets and two new placeholder public Workers exist; local configurations pass dry runs. | No central credentials/provisioner, no hosted native save/publish test, no new-host cutover, and no verified production binding. CHS/ViroiDoc public build triggers still violate save/publish separation. The prepared tokens target one Worker each but also require route-write permission for the shared zone, so their effective scope needs explicit review. |

The generic GNR8 provider registry is primarily a **control-plane inventory**:
most providers above are placeholders with `execution_blocked` and secret
resolution disabled. It must not be interpreted as an executable provider fleet.
The Openprovider contract says `connected` only for read-only sandbox inventory.

## Work to complete, in order

1. **Fix the universal contract before more per-site credentials.** Specify the
   one-time organizational bootstrap, secret ownership/rotation, exact site
   identity, idempotent resource receipts, recovery and cleanup. Reuse the
   current GNR8 ownership and Inngest job path. Keep upstream Stacki untouched.
   Cloudflare supports token creation by API after an initial credential with
   `Account API Tokens Edit`; Worker secrets can be installed programmatically.
   The broader bootstrap credential needs a reviewed permission boundary.
   References: [Cloudflare token creation](https://developers.cloudflare.com/fundamentals/api/how-to/create-via-api/),
   [Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/).
2. **Resolve identity and cost policy.** Decide how every GNR8 authorized owner
   receives the GitHub write permission that native Stacki checks. Define an
   external AI gateway or equivalent control that enforces per-owner usage and
   budget without modifying native Stacki. Verify native OAuth callback on each
   working host.
3. **Implement one site-provisioning operation.** Starting from an owned GNR8
   site, create/reconcile the private repository, draft bucket, Studio Worker,
   public Worker, exact host, shared App/AI secrets, independent session/container
   secrets, a Worker-scoped publish token with the minimum available zone-route
   permission, and a durable launch binding. Read back
   every resource; retries must reconcile rather than duplicate. Avoid exposing
   credentials to the browser or source repository.
4. **Finish the four-site rollout safely.** Disable CHS/ViroiDoc public build
   triggers before pushing their native branches. Provision missing new-Studio
   credentials, deploy real public gateways, migrate only the two confirmed
   working hosts, deploy the Platform binding, and preserve the current serving
   paths until replacement is verified.
   Remove or retire the visible Airship editor entry only after its drafts and
   any still-used customer flow are accounted for.
5. **Exercise the real user journey.** On a fresh site and on each of the four
   current sites, check authorized and denied access, Lumos builder insertion,
   native AI Apply and usage accounting, draft recovery, GitHub-only Push with
   unchanged live domain, Cloudflare Publish with exact-host readback, build
   failure/retry and rollback. Only then claim self-service readiness.
6. **Treat optional business functions separately.** For sites with forms,
   payments or custom domains, implement and test Cloudflare-compatible contact
   delivery, Stripe flows and registrar/DNS operations. Gate actions that entail
   payment, legal acceptance or external identity consent. Do not claim that
   merely connecting every listed provider makes those functions automatic.
   The user has explicitly deferred implementing payments/Stripe; keep its
   requirements in this plan and do not change billing behavior during the
   native Stacki provisioning work.

## Evidence and limits

- Native rollout state: `docs/product/stacki-native-end-to-end-workflow.md`.
- Native preparation/binding: `scripts/stacki/prepare-native-studio.mjs`,
  `apps/platform/gnr8/standalone/native-studio-binding.ts`,
  `apps/worker/gnr8/site/inngest/native-studio-preparation-job.ts`.
- Native access and gateway: `studio/src/features/auth/repositoryAccess.ts`,
  `studio/src/features/deployment/siteGateway.ts` in the prepared site checkouts;
  older GNR8 pilot accounting in `apps/platform/gnr8/stacki/stacki-session-store.ts`
  and `apps/platform/app/api/gnr8/stacki/native-ai/chat/completions/route.ts`.
- Other providers: `apps/platform/gnr8/runtime/providers/provider-contract-registry.ts`,
  `apps/platform/gnr8/standalone/publication-provider.ts`,
  `apps/platform/gnr8/standalone/contact-runtime.ts`,
  `apps/platform/app/api/stripe/webhook/route.ts`,
  `apps/platform/gnr8/runtime/dns/provider-execution-gate.ts`,
  `apps/worker/gnr8/inngest/functions.ts`.
- No new provider action, DNS change, deployment or secret read was performed for
  this audit. Provider-account configuration not directly observed remains
  **unverified**, even where code exists.
