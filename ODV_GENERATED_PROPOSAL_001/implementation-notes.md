# Implementation Notes

## Implementation Shape

The proposal is a dependency-free static website source bundle:

- `source/index.html`
- `source/styles.css`
- `source/script.js`

No package manager, build step, framework, network request, provider call, or
deployment configuration is included.

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

## Navigation and Sections

The website source maps the WGP journey to visible sections:

- `O nas`: observed about/company and host identity signal
- `Relevance`: audience relevance with uncertainty preserved
- `Offer`: offering understanding as unresolved knowledge
- `Trust`: supported trust cue without overclaiming
- `Kontakt`: known action path without invented contact details
- `Limits`: constraint and quarantine preservation

## Accessibility Notes

The source includes:

- semantic landmarks
- skip link
- visible focus-compatible anchors
- responsive layout
- descriptive section headings
- no content hidden behind scripts

The proposal preserves accessibility as an experience obligation, but it does
not claim accessibility compliance.

## Non-Execution Confirmation

No deployment, publishing, DNS mutation, production mutation, compliance run, or
Business Approval was performed.
