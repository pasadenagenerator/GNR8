# GNR8 Multipage Import Tree Architecture

## 1. Problem statement
GNR8 currently captures a high-fidelity single-page import, but it lacks deterministic site-topology truth for real internal routes, route relationships, navigation visibility, and shared global regions.

## 2. Why multipage truth matters
Migration, redesign, runtime routing, CMS schema generation, and operator UX all require a trustworthy page graph. Without route truth, downstream systems overfit to one page and lose structural intent.

## 3. Scope and boundaries
In scope: deterministic, bounded internal-link discovery and site-tree capture.
Out of scope: AI crawling, internet-wide crawling, auth flows, form execution, publish redesign, renderer redesign.

## 4. Discovery model
Entry is a seed URL. Discovery executes deterministic BFS with strict limits (`maxRoutes`, `maxDepth`, `maxLinksPerPage`, `maxTemplateLinksPerRoute`).
Only same canonical host routes are retained. Fetch failures produce partial diagnostics, not nondeterministic retries.

## 5. Route normalization rules
Policy is explicit and deterministic:
- Canonical host is lowercase with `www.` removed.
- Fragment and query are stripped.
- Paths normalized to lowercase.
- `/index.html` and `/index.htm` collapse to `/`.
- Trailing slash removed except root.
- Duplicate slashes collapsed.

## 6. Internal link filtering rules
Filtered out deterministically:
- External hosts
- `mailto:`, `tel:`, `javascript:`, `data:`
- Hash-only links
- Asset/download extensions (images, css/js, pdf/zip/media/fonts, etc.)

## 7. Page role classification model
Route roles are inferred via deterministic heuristics from path/title/depth/prefix density:
- `homepage`, `contact`, `legal`, `utility`
- `blog`, `article`, `listing`, `detail`
- fallback `standard` or `unknown`

## 8. Navigation visibility model
Visibility classes are inferred from link context cluster signals:
- header/nav context -> `header`
- footer context -> `footer`
- utility/meta context -> `utility`
- body discovery -> `discovered_only`
- none -> `unknown`

## 9. Navigation tree model
Three trees are built deterministically from classified routes:
- primary tree
- utility tree
- footer tree
Parent-child semantics use canonical path ancestry when parent exists in-scope.

## 10. Shared region inference model
Shared-region candidates are inferred from repeated signatures across pages:
- header link clusters
- footer link clusters
- repeated nav-block signatures
- repeated CTA-band signatures
Each candidate stores kind, member pages, confidence, and deterministic signature.

## 11. Template family / route family model
Route families are grouped by stable prefix and role composition:
- listing/detail family
- article family
- prefix family
Relationships are persisted as deterministic listing-to-detail or family-member edges.

## 12. Provenance and persistence model
Multipage truth is additive in `RuntimeImportProvenanceSummary`:
- `multipageImport.summary` (counts/limits/diagnostics)
- optional `multipageImport.tree` (full topology truth)
Read-model parsing surfaces `pipeline.multipageImportSummary` for workspace visibility.

## 13. Diagnostics model
Deterministic diagnostics include lifecycle, filters, bounds, and inference:
- start/completion
- discovered/duplicate/limit/depth
- external/asset skip
- route classification
- nav/shared-region/template inference
- degraded/partial discovery markers
Diagnostics are de-duplicated and lexicographically sorted.

## 14. Determinism strategy
Determinism is enforced through:
- stable normalization
- bounded traversal
- stable sorting for links/routes/diagnostics
- deterministic IDs (sha256-derived)
- no AI/LLM and no random ranking

## 15. Risks / open questions
- Live-site fetch variability can still change results over time; deterministic behavior is guaranteed for same inputs and fetched content.
- In current pipeline integration, discovery is intentionally additive and non-blocking.
- Future signal enrichment may improve shared-region precision without changing contract semantics.

## 16. Rollout recommendation
Roll out in phases:
1. Enable summary-only consumption in read-model/UI.
2. Monitor diagnostic distributions and limit-hit frequency.
3. Incrementally enable full-tree downstream consumers (merge/runtime/schema).

## 17. Final recommendation
Adopt the multipage import tree as canonical topology truth for all downstream phases. Keep deterministic constraints strict and treat multipage inference as a first-class provenance artifact, not a UI-only convenience.
