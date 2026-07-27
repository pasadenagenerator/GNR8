# GNR8 Publish Target Source Truth Design

AAF-8 publish target source truth design for publish activation evidence.

This document is documentation-only. It proposes source-truth architecture but does not create SQL migrations, implement target storage, or modify publish behavior.

## Current State

Current implementation facts:

- Publish route accepts optional body `stage` of `shadow`, `canary`, or `production`.
- `publishApprovedSiteVersion` defaults stage to `production`.
- Runtime artifacts store `publish_stage`.
- Enforcement adapters evaluate stage-specific readiness.
- AAF-7 builder accepts `intendedPublishTarget` and treats it as a required source key.
- No dedicated canonical publish target table or config source was found.

Current gap:

- Publish target truth is currently an action input plus runtime/artifact policy behavior.
- It must not be inferred from UI labels, button text, route names, or request body alone for AAF enforcement.

## Decision

MVP publish targets should be database-backed policy/config records, not static constants and not UI-only labels.

Recommended proposed table:

- `public.gnr8_publish_targets`

Why not static constants:

- AAF evidence needs source refs and watermarks.
- Environment separation and future tenant/site policy require durable truth.
- Static constants cannot show when target policy changed.

Why not site-scoped-only config:

- The allowed target vocabulary is platform/environment policy.
- Site-specific enablement should be an override or policy attachment, not the target identity itself.

## Proposed Source Identity

Proposed fields:

| Field | Purpose |
| --- | --- |
| `id text primary key` | Stable target id such as `production`, `canary`, `shadow`. |
| `environment text not null` | Deployment environment such as `production`, `preview`, `staging`, `development`. |
| `target_kind text not null` | `public_runtime`, `preview_runtime`, or `internal_runtime`. |
| `publish_stage text not null` | Runtime stage: `production`, `canary`, or `shadow`. |
| `status text not null default 'active'` | `active`, `disabled`, or `retired`. |
| `policy_version text not null` | Target policy version. |
| `requires_aaf boolean not null default true` | Whether AAF publish gate is required. |
| `requires_ddom_snapshot boolean not null default true` | Whether DDOM readiness snapshot is required. |
| `requires_launch_signoff boolean not null default true` | Whether launch signoff is required. |
| `allowed_artifact_stages jsonb not null default '[]'::jsonb` | Allowed artifact `publish_stage` values. |
| `limitations_json jsonb not null default '{}'::jsonb` | Explicit limitations. |
| `created_at timestamptz not null default now()` | Creation timestamp. |
| `updated_at timestamptz not null default now()` | Watermark field. |

Optional future attachment table:

- `public.gnr8_site_publish_target_policies`

Use it only when a site/client/tenant needs target-specific overrides. MVP can begin with global environment records plus explicit target id in evidence.

## Source Refs

AAF source ref for target:

- `sourceSystem`: `gnr8`
- `sourceTable`: `gnr8_publish_targets`
- `sourceRecordId`: target id
- `sourceRef`: `gnr8:gnr8_publish_targets:<target-id>`
- `sourceVersion`: policy version or `updated_at`
- `currentWatermark`: `updated_at:<timestamp>` or stable target hash
- `evidenceWatermark`: same value captured by evidence package

If a site-scoped attachment is later used, evidence should include both:

- global target ref;
- site target policy attachment ref.

## Watermarks

Preferred watermark:

- `updated_at` plus `policy_version`.

Fallback stable hash fields:

- id
- environment
- target_kind
- publish_stage
- status
- policy_version
- requires_aaf
- requires_ddom_snapshot
- requires_launch_signoff
- allowed_artifact_stages
- limitations_json

The reader should fail closed if the requested target row is missing, disabled, retired, or mismatched with the requested environment.

## Environment Separation

The source reader should receive or derive an explicit deployment environment from trusted server context, not from UI labels.

Rules:

- `production` environment target can reference public runtime activation.
- `preview` environment target can reference preview/internal runtime and should not be confused with public publish.
- `shadow` stage is review/runtime-governance stage, not production cutover unless target policy explicitly says so.
- A target id must be unique and must encode only target identity, not a mutable user-facing label.

## Production Vs Preview Handling

Production publish activation:

- requires `gnr8_publish_targets.production` or a site policy attachment to be active;
- requires AAF publish activation evidence;
- requires DDOM snapshot or explicit not-applicable/exception policy;
- references active pointer and runtime artifact source truth.

Preview target:

- may be used by preview workflows but should not satisfy public publish activation evidence;
- should use a different action key/scope if later gated.

Canary/shadow:

- may be target records if GNR8 supports them as explicit release targets;
- must still cite target policy truth and runtime artifact stage compatibility.

## Audit Implications

Publish audit events should include:

- target id;
- target source ref and watermark;
- environment;
- artifact publish stage;
- policy version;
- target mismatch blockers if present.

Changing a publish target policy should be audited separately as target configuration change. It must not rewrite historical evidence.

## AAF Evidence Usage

Publish activation evidence should include publish target truth as a required source key.

Evidence impact:

- missing target row: invalid evidence and blocked dry run;
- target disabled/retired: present but freshness `failed` or blocked limitation;
- target watermark mismatch between evidence and gate: stale evidence;
- artifact publish stage not allowed by target policy: blocked source limitation and gate blocker.

## Recommendation

Implement `gnr8_publish_targets` as a small canonical target policy table before production source reader implementation. Seed `production`, and optionally `shadow`/`canary` only if they are real supported targets, not UI conveniences. Until then, live publish enforcement must not begin.

