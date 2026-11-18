# GNR8 internal AI pilot

This is the existing superadmin-only Airship draft operation, not a new public
AI endpoint or a production publishing capability. OpenAI transport is isolated
behind `AIProvider`. A future Sference adapter must implement that interface;
no Sference endpoint, credentials, prices or OpenAI compatibility are assumed.
The current route response remains OpenAI-specific until another adapter is wired.

## Approved defaults

- Model: `gpt-5.4-mini-2026-03-17` (the alias is accepted, transport pins the snapshot).
- Standard service tier (`default` in the API), low reasoning, no tools, no retries.
- At most 4,000 input tokens and 1,000 total output tokens including reasoning.
  Input is conservatively bounded by UTF-8 bytes including schema and 512 bytes
  of framing headroom; this may reject some prompts below 4,000 actual tokens.
- 45 second request timeout; no fallback to a different model/provider.
- Ten requests total in pilot-1, including connection tests and failed calls.
- One in-flight request across instances; USD 1/day and USD 5/month, UTC.
- Reserve USD 0.0075 per attempt at uncached list price, regardless of credits.
  Reservations are retained rather than refunded. This deliberately overcounts
  actual spend. Missing/over-limit usage or crashed calls block the pilot until
  an operator reconciles the outcome. Do not delete history to reset the budget.

## Activation sequence

1. The migration was tested locally and applied through the SQL Editor to the
   GNR8 Supabase project on 2026-11-18. Its RPCs and table are service-role only.
   The scope is the fixed internal GNR8 pilot, not a caller-supplied agency or
   user scope. The SQL Editor does not record Supabase CLI migration history;
   the migration is safe to reapply when the CLI later records it.
2. Create a new key in the intended OpenAI GNR8 project with **Restricted**
   permissions and **Model capabilities: Request** only. The current key form
   offers those restrictions for a user-owned key; its Service account choice
   creates a bot member and does not expose permission selectors. Do not paste
   the key into chat or commit it. Set expiration within the project maximum of
   90 days, preferably 30 days for the pilot.
3. Set a dedicated random `GNR8_AIRSHIP_BYOK_ENCRYPTION_KEY` (at least 32
   characters) in server secrets. New credential saves require it. Legacy
   decryption fallback remains for compatibility; migrate existing encrypted
   credentials deliberately before replacing their encryption secret.
4. Save the project API key through the existing authenticated superadmin
   credential form with the model above. Never use `NEXT_PUBLIC_` for secrets.
5. The OpenAI GNR8 project is limited to 10,000 TPM and 2 RPM for
   `gpt-5.4-mini`, and new keys have a 90-day maximum life. The current OpenAI
   account UI exposes no project spend cap or spend alerts. The application
   budget remains the monetary guard for this route; other project keys or
   routes are outside it. Check billing before enabling automatic recharge.
6. Only after explicit authorization, set `GNR8_AI_EXECUTION_ENABLED=true` on
   the intended server environment. It is closed by default, including the
   connection-test button. Do not enable this during local mocked tests.
7. Run one authorized bounded request and check Usage/Costs for the actual
   incentive. Ten attempts maximum; no purchases or automatic reload needed
   merely because a request failed.

Account readback on 2026-11-18: Personal organization, GNR8 project
`proj_CEXJoKgpcM0F1OFMB5XeXgUZ`, USD 64 available, received November 17,
expires December 3, 2026, linked to ChatGPT workspace GNR8. This is a dated
observation, not runtime billing truth. Input/output sharing is enabled only
for GNR8. Use public/synthetic test content within the accepted sharing terms.

## Local checks

Run with `TSX_TSCONFIG_PATH=apps/platform/tsconfig.json node
--conditions=react-server --import tsx --test` and the AI provider test plus
the Airship AI command/provider route tests. Transport and budget RPC traffic
are mocked; no provider calls or hosted database writes occur.

The existing draft validation, superadmin authorization, CHS identity checks
and live-site/publish restrictions are preserved. OpenAI JSON is schema-bound;
GNR8 still validates the result before applying draft changes.

## Stacki text proposals

The Stacki AI panel is owned by GNR8, beside the existing editor launcher. It
reads and updates the authorized, revisioned Stacki draft through the same
storage boundary as manual Save. It does not import Studio components, inspect
its DOM or send an AI key to its isolated runtime. A user selects unique static
text on the home page, reviews a plain-text proposal, then explicitly saves
one new draft revision. The route rechecks scope, actor, revision and checksum;
concurrent edits fail closed. Open Studio sessions must be saved and closed
before applying a proposal. Publication remains a separate review action.

An upstream Stacki upgrade still needs the existing Studio patch/runtime
compatibility checks. The AI adapter itself depends only on the GNR8 draft
contract, so it does not need to change when Studio's internal UI changes.
Only `h1`-`h6`, `p`, `span`, `li`, `button` and `a` literal text in
`src/pages/index.astro` is supported in this first slice. The shared pilot
budget and `GNR8_AI_EXECUTION_ENABLED` gate apply to proposals; applying an
already reviewed proposal makes no provider call.

The superadmin AI Settings page reads the same service-role reservation ledger
and shows shared pilot attempts, known tokens, remaining attempts and an
uncached-list-price estimate. Unknown/uncertain usage is labeled rather than
reported as zero. OpenAI Analytics remains the source for billed charges and
credit application; the GNR8 estimate does not include API activity outside
this pilot.

## Verification on 2026-11-18

- 28 focused provider, command-route, credential-route and profile tests passed.
- Migration applied successfully in a disposable local PostgreSQL 17 container.
- `budget.local-test.sql` passed: restricted permissions, in-flight exclusion,
  uncertain-outcome blocking, ten-attempt ceiling and retained reservation cost.
- Two independent concurrent service-role sessions: one reservation succeeded,
  the other was rejected. The disposable container was removed afterward.
- Full platform TypeScript check remains failing in unrelated files (including
  generated ops-inbox exports and preview-host-binding test types); no diagnostics
  refer to files changed for this integration. Diff whitespace check passed.
- Hosted Supabase migration applied through the SQL Editor and its table/RPC
  read back successfully; zero reservations. OpenAI project model rate limit
  and maximum key lifetime saved and read back. No deployment, credential
  creation, provider request or purchase was performed.
