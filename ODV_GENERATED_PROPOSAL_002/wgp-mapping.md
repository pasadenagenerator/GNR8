# WGP Mapping

Source WGP: `website-generation-package:0bb33dd388323a443bf36be58bf2d9a1`

Source artifact: `website_generation_package_c2c555025f186178f27c44c7cd272d4d`

## Business Identity

- WGP signal: `odv-cvijanovic.si` is the first observed business identity signal.
- Proposal location: `source/index.html#identity`
- Implementation: Hero headline uses `odv-cvijanovic.si` and labels it as an observed host identity signal, not a legal business identity.

## Core Messages

- Imported host identity signal: represented in `#identity` and metadata.
- `O nas` about/company wording: represented in navigation and `#relevance`.
- `Kontakt` trust/action path: represented in navigation and `#kontakt`.
- Imported assets may carry brand signals: represented in `#trust` and `#evidence`.
- Contact path as basic trust/accessibility signal: represented in `#trust` and `#kontakt`.

## Journey Roles

- Entry Experience / recognize: `#identity` and `#relevance`
- Offer Understanding / understand: `#offer`
- Trust Building / trust: `#trust`
- Action Readiness / act: `#kontakt`

## Validation Contract

- `business_positioning`: `#identity`, `#kontakt`
- `audience_representation`: `#relevance`, `#limits`
- `message_coverage`: `#identity`, `#trust`, `#evidence`
- `brand_consistency`: `#trust`, `#evidence`
- `navigation_completeness`: primary navigation and all section anchors
- `journey_completeness`: recognize, understand, trust, act sections
- `trust_signal_coverage`: `#trust`, `#kontakt`
- `accessibility_expectations`: semantic HTML, skip link, headings, focus states, responsive navigation, alt text
- `seo_intent`: title/meta plus visible business identity and preserved unresolved offer/audience state
- `constraint_preservation`: `#offer`, `#relevance`, `#limits`

## Constraint Preservation

The proposal keeps the following WGP constraints visible:

- Business Discovery inherited 102 upstream evidence limitations.
- Candidate Discovery context is available with 4 reconstruction candidates.
- Business Alignment did not resolve audience knowledge.
- Business Alignment did not resolve offering knowledge.
- Business Discovery did not provide deterministic audience knowledge.
- Business Discovery did not provide deterministic offering knowledge.
- Imported asset and evidence diagnostics remain known limitations.
