# Improvement Mapping

Source improvement plan: `generation-improvement-plan:0fb5c2904f143633c1d1b28ee217ba7d`

Source artifact: `generation_improvement_plan_5401cbae3566e77aa4014e35ae73e694`

The plan contains 413 provider-neutral improvement actions:

- Critical: 259
- Medium: 154
- Accessibility: 1
- Assets: 123
- Business Positioning: 4
- Constraints: 228
- Messages: 6
- Navigation: 8
- SEO: 1
- Sections: 36
- Trust: 6

## Accessibility

Implemented as observable semantic structure:

- `html lang="en"`
- skip link
- landmark header, nav, main, footer
- responsive navigation button with `aria-expanded`
- descriptive alt text on local assets
- visible headings for every journey section
- focus-visible styles
- no content hidden behind script-only interactions

## Assets

Implemented as local, deterministic asset evidence:

- `source/assets/identity-signal.svg`
- `source/assets/navigation-evidence.svg`
- `source/assets/contact-path.svg`
- `source/assets/asset-inventory.svg`
- `source/assets/constraint-map.svg`

These assets are abstract evidence visuals. They do not claim to be original ODV brand assets, logos, offices, staff, products, or legal identity.

## Business Positioning

Implemented by preserving only supported positioning:

- observed host identity signal
- `O nas` about/company wording
- `Kontakt` action path
- explicit low-confidence and partial-source state

No stronger positioning claim is introduced.

## Constraints

Implemented by keeping unresolved knowledge visible and avoiding contradictory content:

- no invented audience
- no invented offerings
- no contact details
- no certification, quality, legal, price, service, geographic, or testimonial claims
- boundary text confirms no deployment, publishing, compliance, or approval

## Messages

Implemented by giving each required message a visible location and role:

- identity message in `#identity`
- about/company message in `#relevance`
- trust/contact message in `#trust` and `#kontakt`
- asset uncertainty message in `#trust` and `#evidence`

## Navigation

Implemented by making every WGP journey destination reachable from the primary navigation:

- `O nas`
- `Relevance`
- `Offer`
- `Trust`
- `Kontakt`
- `Evidence`
- `Limits`

## SEO

Implemented conservatively:

- document title includes ODV proposal identity
- visible host identity signal is present
- offer and audience relevance remain visible as unresolved knowledge
- `noindex, nofollow` preserves quarantine status

## Sections

Implemented by creating distinct, inspectable sections with WGP data hooks:

- `#identity`
- `#relevance`
- `#offer`
- `#trust`
- `#kontakt`
- `#evidence`
- `#limits`

## Trust

Implemented only from supported trust evidence:

- `Kontakt` path is present.
- Imported assets may carry brand signals.
- Trust uncertainty is explicit.
- No testimonials, certifications, legal claims, reputation claims, quality claims, or result claims are added.
