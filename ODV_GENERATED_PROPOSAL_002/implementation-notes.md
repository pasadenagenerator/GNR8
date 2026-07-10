# Implementation Notes

## Implementation Shape

The proposal is a dependency-free static website source bundle:

- `source/index.html`
- `source/styles.css`
- `source/script.js`
- local SVG assets under `source/assets/`

No package manager, build step, framework, network request, provider call,
deployment configuration, DNS configuration, compliance harness, or approval
artifact is included.

## Iteration 2 Changes

Compared with the first generated proposal shape, this iteration makes evidence
more observable for later deterministic import and compliance validation:

- WGP page and section identifiers are exposed with `data-wgp-page` and
  `data-wgp-section` attributes.
- WGP validation areas are exposed with `data-validation-area` attributes.
- Improvement categories are exposed on the evidence section.
- Primary navigation reaches all journey destinations.
- Local visual assets are referenced by the HTML source and listed in the
  manifest.
- Accessibility obligations are represented with semantic landmarks, skip link,
  clear headings, responsive navigation, alt text, and focus states.

## Content Strategy

The page preserves only WGP-supported material:

- observed host identity signal: `odv-cvijanovic.si`
- observed about/company navigation wording: `O nas`
- observed contact/action path: `Kontakt`
- contact path as a basic trust and accessibility signal
- imported assets as possible brand signals only
- explicit low confidence and unresolved audience/offering knowledge

The proposal intentionally avoids business details not present in the WGP:

- no services or products
- no prices
- no guarantees
- no certifications
- no team details
- no process claims
- no legal claims
- no geographic coverage
- no customer segments
- no testimonials
- no case studies
- no statistics
- no contact details

## Non-Execution Confirmation

No deployment, publishing, DNS mutation, production mutation, compliance run,
proposal import, canonical artifact mutation, or Business Approval was
performed.
