# GNR8 Single-Site MVP CUTLINE-27C One-Site Source-Capture Post-Submit Readback

Date: 2026-08-18

## Status

Passed. Read-only production readback confirmed that the human-submitted source-capture request created the first selected single-site source-truth record for `https://www.chs.si/`.

Online verification status: `source_capture_completed_pending_review_or_next_step`.

## Boundary

This task performed only production DB readback through a `repeatable read read only` transaction.

- Source-capture POSTs sent by Codex in CUTLINE-27C: `0`.
- Second source-capture POST sent by Codex: no.
- Production insert/update/delete by Codex: none.
- Dry-run, shadow-publish, runtime publish, rollback, active pointer mutation, launch readiness, AAF approval request, AAF decision, gate attempt, provider, DNS/domain, billing, Stripe, Openprovider, deploy, migration, env mutation, commit, or push by Codex: none.

## Selected Input

- Client: `Glazura Glizon`
- `clientId`: `e61d1982-068f-4d84-bb6f-c3fbfc93f39b`
- `agencyId`: `6a09c2d9-12c3-4c19-a466-0c29ae2f723e`
- Source URL/domain: `https://www.chs.si/`
- Rehearsal posture: `internal test`
- Human-submitted idempotency/correlation values: `gnr8-cutline-27-chs-si-source-capture-20260818`

## Readback Method

The readback used the existing production database environment artifact without printing secrets. The script opened:

`begin isolation level repeatable read read only`

Transaction readback returned `transaction_read_only=on`, `transaction_isolation=repeatable read`, and `read_at=2026-08-18 08:51:49.738039+00`.

## Source Truth

Selected source-domain site row exists.

- `siteId`: `a03fcb5b-6ad9-4b19-a682-4c06f998881a`
- `org_id`: `e61d1982-068f-4d84-bb6f-c3fbfc93f39b`
- `agency_id`: `6a09c2d9-12c3-4c19-a466-0c29ae2f723e`
- `domain`: `www.chs.si`
- `status`: `draft`
- `created_at`: `2026-08-18 08:45:01.101164+00`

Single-site migration exists.

- `migrationId`: `682a09fd-8fd5-4f73-93b8-54f5d4067c63`
- `site_id`: `a03fcb5b-6ad9-4b19-a682-4c06f998881a`
- `ownership_site_id`: `a03fcb5b-6ad9-4b19-a682-4c06f998881a`
- `runtime_site_id`: `site_57d9665a3a5867edf6ef`
- `runtime_site_version_id`: `14e6ff38-eef3-4790-8ffb-f72aa5d6cd35`
- `source_url`: `https://www.chs.si/`
- `canonical_source_url`: `https://www.chs.si/`
- `intended_launch_domain`: `www.chs.si`
- `current_state`: `source_evidence_review_required`
- `current_stage`: `source_evidence_review`
- `latest_source_evidence_review_id`: `40c0b86c-0349-4b7c-89c2-bfdef7e9fea3`
- `latest_state_event_id`: `0a6bcc72-d5ce-4c93-a7a1-6bc2604ab244`
- `source_watermark`: `imported-url-site-6cba4d2b35d630b5`
- `created_at`: `2026-08-18 08:45:01.929861+00`
- `updated_at`: `2026-08-18 08:45:18.743017+00`

The persisted migration correlation/idempotency values are canonical internal import/capture-spine refs:

- `correlation_id`: `runtime-import-correlation_1075d44bcc0f4f89a531`
- `idempotency_key`: `single-site-capture:runtime-import-correlation_1075d44bcc0f4f89a531:migration`

The human UI response stayed redacted and did not expose the raw migration/site/source refs.

## Source Evidence

Source evidence review exists.

- `sourceEvidenceReviewId`: `40c0b86c-0349-4b7c-89c2-bfdef7e9fea3`
- `source_evidence_package_key`: `url-import-snapshot:imported-url-site-6cba4d2b35d630b5`
- `source_watermark`: `imported-url-site-6cba4d2b35d630b5`
- `capture_run_id`: `imported-url-site-6cba4d2b35d630b5`
- `render_job_id`: `imported-url-site-6cba4d2b35d630b5`
- `completeness_status`: `complete_with_warnings`
- `review_status`: `ready_for_review`
- `evidence_captured_at`: `2026-08-18 08:44:12.553+00`
- `created_at`: `2026-08-18 08:45:04.03831+00`

Migration refs for the selected migration:

- source evidence review ref `c41c7f54-e6d2-49bf-87a3-abcf47a176f7`
- capture run ref `38cb633e-1972-4d66-8d98-c61684819c21`
- render job ref `46a3f0e2-784c-4852-a9a9-bb0f83e90a81`
- source evidence package ref `40820f6f-d57e-40b8-a7ca-7ad8d13c3e43`

Source evidence review refs exist: `38` rows. Key ref roles include `source_url`, `page`, `raw_html`, `text_extract`, `metadata`, `rendered_dom`, `screenshot`, `image_asset`, `asset`, `font_ref`, and `visual_identity`.

Source evidence review item rows exist: `10` rows. Categories are `source_url`, `page`, `screenshot`, `dom`, `text`, `image`, `asset`, `font`, `visual_identity`, and `metadata`; none block clone generation in this readback.

## Before And After Counts

Prior selected counts were zero in CUTLINE-27. CUTLINE-27C readback found:

| Scope | Before | After |
| --- | ---: | ---: |
| selected source-domain site rows | 0 | 1 |
| `gnr8_single_site_migrations` for selected source | 0 | 1 |
| all `gnr8_single_site_migrations` | 0 | 1 |
| selected migration refs | 0 | 4 |
| selected migration events | 0 | 3 |
| selected source evidence reviews | 0 | 1 |
| selected source evidence review refs | 0 | 38 |
| selected source evidence review items | 0 | 10 |

Migration events show the source-capture-only progression:

- `source_capture_started`
- `source_capture_completed`
- `source_evidence_review_required`

## Downstream Forbidden Counts

Forbidden downstream workflow/publish counts remained zero or unchanged.

| Scope | Before | After |
| --- | ---: | ---: |
| launch readiness records for selected migration | 0 | 0 |
| publish operator action rows | 0 | 0 |
| AAF approval requests | 0 | 0 |
| AAF approval decisions | 0 | 0 |
| AAF gate attempts | 0 | 0 |
| runtime active pointers | 6 | 6 |

## Conclusion

CUTLINE-27C succeeds. Read-only production verification confirms source truth now exists for the selected `chs.si` rehearsal site, and no downstream launch readiness, publish operator action, AAF approval, AAF decision, AAF gate, dry-run, shadow-publish, runtime publish, rollback, active pointer, provider, DNS/domain, billing, Stripe, Openprovider, deploy, migration, env, commit, or push behavior occurred by Codex during this readback.

Recommended next milestone: source evidence operator review for `sourceEvidenceReviewId=40c0b86c-0349-4b7c-89c2-bfdef7e9fea3`, still without dry-run/shadow-publish/runtime publish until review/clone/proposal/approval/readiness prerequisites are intentionally advanced.
