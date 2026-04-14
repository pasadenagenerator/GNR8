# Site Template Family Extraction Architecture

## 1. Problem statement
Multipage import currently provides deterministic route and topology truth, but pages are still treated too independently. We need deterministic family-level truth that identifies reusable page skeleton patterns across route groups.

## 2. Why template-family truth matters
Template families make downstream systems route-aware and reusable by default: design handoff can target families instead of isolated pages, merge can preserve family invariants, runtime can optimize structure reuse, and CMS modeling can infer listing/detail + variant schemas from stable family groupings.

## 3. Scope and boundaries
This implementation is deterministic structural inference only. It does not use LLMs, embeddings, pixel similarity, OCR, renderer generation, CMS generation, or merge-engine redesign. It layers additively on existing multipage truth.

## 4. Input truth sources
Inputs come from existing deterministic sources:
- normalized multipage route nodes and page roles
- navigation/tree-driven multipage topology
- shared-region candidates
- fetched-page structural signals extracted during multipage traversal (section roles, layout sequence, heading patterns)

## 5. Family signature model
Each family has a deterministic signature:
- ordered `sectionRoleSequence`
- ordered `layoutPatternSequence`
- ordered `headingPatternSequence`
- deterministic `routePattern` abstraction
- `pageRoleDistribution`
- `sharedRegionSignature`

## 6. Family grouping rules
Routes are clustered deterministically using stable ordering plus rule-based compatibility:
- role compatibility gate
- route prefix compatibility gate
- weighted structural similarity (section/layout/heading/shared-region/prefix/density)
- minimum similarity thresholds to avoid false merges
Outliers remain singleton families.

## 7. Family kind classification
Family kind is deterministic from role distribution + route pattern + confidence:
- `homepage_family`, `listing_family`, `detail_family`, `article_family`, `legal_family`, `utility_family`, `standard_page_family`, `mixed_family`, `unknown_family`.

## 8. Route-pattern abstraction model
Route patterns are abstracted from sorted normalized paths by longest-common-prefix plus suffix-shape rules:
- single varying suffix => `/:slug`
- deeper varying suffix => `/:path`
Examples: `/blog/:slug`, `/products/:slug`, `/services/:slug`.

## 9. Representative-page selection
Representative route is deterministic:
- homepage route when present
- otherwise route with highest average structural similarity to peers
- tie-break by shortest path then lexical path order

## 10. Shared-region influence model
Shared-region overlap contributes directly to clustering scores and signatures. It influences assignment but does not dominate role/structure compatibility gates.

## 11. Relationship inference model
Family-level relationships are inferred deterministically:
- `listing_to_detail` by kind + route-prefix relation
- `parent_to_child` by route-pattern hierarchy
- `sibling_family` by shared family root
- `shared_template_variant` by signature equivalence across different route patterns

## 12. Outlier / mixed-family handling
Low-confidence or incompatible pages are not force-merged. The extractor emits singleton families and uses `mixed_family`/`unknown_family` where appropriate, prioritizing truthful grouping over aggressive clustering.

## 13. Provenance and persistence model
`MultipageImportTree` now persists full `templateFamilyExtraction`. `MultipageImportSummary` includes `templateFamilyExtraction` summary metrics (family counts, singleton/mixed counts, relationship counts, confidence counts, diagnostics). Runtime provenance and workspace parsing consume this additively with backward-safe defaults.

## 14. Diagnostics model
Template-family diagnostics are deterministic, sorted, deduplicated, and persisted:
- start/completion
- signature/route-pattern computation
- family creation/classification
- assignment/unassigned routes
- shared-region usage
- inferred relationships
- low-confidence/degraded signals

## 15. Determinism strategy
Determinism guarantees come from:
- stable sorting of routes/families/assignments/relationships/diagnostics
- stable hashing for IDs
- rule-based thresholds only (no randomness)
- reproducible tie-breakers for representatives and cluster membership

## 16. Risks / open questions
- Structural signals from sparse HTML can reduce confidence and increase singleton output.
- Prefix-based thresholds may need tuning for deeply nested enterprise route taxonomies.
- Legacy `routeFamilies/pageRelationships` compatibility mapping is lossy vs full family truth.

## 17. Final recommendation
Adopt template-family extraction as the canonical reusable-structure truth for downstream systems, while keeping legacy family fields as compatibility projections until all consumers migrate to `templateFamilyExtraction`.
