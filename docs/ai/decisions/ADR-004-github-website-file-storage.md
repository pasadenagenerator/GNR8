# ADR-004: Website files live in GitHub

## Status

Accepted database boundary; delivery and cache design pending performance review.

## Date

2026-11-07

## Decision

GitHub is the durable source for every website file in the new GNR8 → Stacki →
Publish workflow: the editable Astro project, retained assets, generated HTML
and CSS, and candidate/release payloads. GNR8's database stores only identities,
immutable GitHub references (repository, commit and path), hashes, sizes,
ownership, approvals, publication state and audit records. It must not store
website file bytes, source text, rendered HTML/CSS or base64 in JSON fields.

GNR8 verifies the exact referenced bytes and commit before marking a version
ready, approving it or publishing it. A missing, changed or inaccessible GitHub
object fails closed. ADR-003's immutable-artifact and snapshot requirements
remain; the artifact payload moves out of the database, while the database
retains its identity and verifiable reference.

Public delivery and Stacki preview may use a deployment or content-addressed
object/CDN cache built from the pinned GitHub commit. Such a copy is a serving
derivative, not a second editable source. Serving must not require one GitHub
API request for every visitor or asset. Stacki Open must prioritize the first
visible page over transferring every retained asset before startup.

## Transition

The current implementation violates this rule: runtime artifacts contain HTML,
CSS and project files in database JSON, while some candidate and release bytes
are in Supabase object storage. The product owner plans to delete and reimport
old websites; no migration of their file bytes is required. Existing data must
remain readable until that separate deletion/reimport is explicitly performed.
The cutover must stop new file-bearing writes before any new workflow is marked
complete. No destructive migration or public-host switch is implied by this
decision alone.
