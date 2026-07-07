# WGP Mapping

## Source Identity

- Export ID: `odv-export-25b18a7102ed29c2`
- WGP ID: `website-generation-package:0bb33dd388323a443bf36be58bf2d9a1`
- WGP contract version: `MVP-1F`
- WGP status: `partial`
- WGP confidence: `LOW`

## Business Context

WGP source statement:

> The generation system must preserve this business context: The website should represent the business through this aligned understanding: Imported website host odv-cvijanovic.si is observed as the first business identity signal. About/company wording is present in website structure: O nas. The website should act as the business experience projection of the aligned Digital Business Twin. Prioritize this business information for visitor understanding: Captured section evidence includes website content regions: navigation.

Proposal mapping:

- `source/index.html` hero and `O nas` section preserve the host and about/company signals.
- The page does not claim a stronger legal identity.
- Navigation remains central because captured source evidence includes navigation.

## Objectives

| WGP objective | Proposal coverage |
| --- | --- |
| Website structure exposes a contact or conversion path: `Kontakt`. | `source/index.html#kontakt` reserves a visible Kontakt action area. |
| Website wording suggests a business goal or visitor action: `Kontakt`. | Hero action and navigation link point to the Kontakt section. |

## Messages

| WGP message role | WGP statement | Proposal coverage |
| --- | --- | --- |
| primary | Imported website host `odv-cvijanovic.si` is observed as the first business identity signal. | Header, hero, O nas section, footer. |
| primary | About/company wording is present in website structure: `O nas`. | Navigation and O nas section. |
| trust | A contact path is present, which is a basic trust and accessibility signal. | Trust and Kontakt sections. |
| brand | Imported evidence includes 384 persisted assets that may carry brand signals. | Limits section preserves this as possible, unconfirmed brand signal. |

## Audience

WGP audience statements:

- No aligned Digital Business Twin knowledge is available for this section.
- Business Alignment unresolved: Business Discovery did not provide deterministic knowledge for audience. Business Alignment validation did not add new business facts.
- Business Discovery did not provide deterministic knowledge for audience.

Proposal mapping:

- `source/index.html#relevance` explicitly states that audience relevance remains unresolved.
- No customer segments, personas, industries, geographies, or needs are invented.

## Offerings

WGP limitation:

- Business Discovery did not provide deterministic knowledge for offerings.
- Business Alignment validation did not add new offering facts.

Proposal mapping:

- `source/index.html#offer` represents offer understanding as missing knowledge.
- No services, products, prices, guarantees, processes, certifications, or coverage claims are invented.

## Journey Destinations

| WGP journey destination | Proposal section |
| --- | --- |
| Determine whether the business is relevant once audience knowledge is clarified. | `#relevance` |
| Understand the offer once offering knowledge is clarified. | `#offer` |
| Find business proof that reduces uncertainty. | `#trust` |
| Understand the most appropriate next business action. | `#kontakt` |

## Validation Expectation Preservation

This proposal does not run compliance. It preserves the WGP validation
expectations for later review:

- business positioning
- audience representation without invention
- message coverage
- brand consistency with preserved limitations
- navigation completeness
- journey completeness
- trust signal coverage without overclaiming
- accessibility expectations as experience obligations
- SEO intent from business meaning
- constraint preservation

## Constraint Preservation

The proposal preserves the key constraints:

- inherited upstream evidence limitations remain unresolved
- Candidate Discovery context does not resolve missing business knowledge
- source WGP status remains partial
- audience and offering knowledge remain missing
- brand semantics remain unconfirmed
- no generated proposal authority over compliance, approval, publishing, DNS, production, or canonical artifacts
