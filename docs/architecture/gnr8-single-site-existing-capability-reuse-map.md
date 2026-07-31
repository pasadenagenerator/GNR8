# GNR8 Single-Site Existing Capability Reuse Map

Phase: MVP-19
Scope: Design-only reuse map for future single-site improvement execution

This document maps existing repository capabilities that can support the future single-site improvement execution path. It does not implement execution, validators, adapters, SQL, routes, workers, UI, AI calls, provider calls, runtime mutation, content edits, publish, rollback, billing, domain, DNS, Command Center, Ops Inbox, client portal, commit, or push behavior.

## Classification Model

| Classification | Meaning |
| --- | --- |
| `Reuse directly` | Existing primitive can be used by a future governed executor with the same narrow semantics and execution-time gate checks. |
| `Reuse behind new adapter` | Existing primitive is useful but must be wrapped so MVP execution gets scope validation, idempotency, refs, limitations, and evidence writes. |
| `Reuse as evidence only` | Existing output can be cited as source/evidence but must not author canonical execution truth. |
| `Reuse as advisory/projection only` | Existing output helps operators or planning but is not canonical and should not drive mutation by itself. |
| `Unsafe for MVP execution` | Surface mutates or can mutate too broadly, lacks MVP gating, or has unclear product authority. |
| `Legacy/historical` | Exists but is explicitly non-canonical or historical. |
| `Missing` | No current primitive was found for the MVP-19 execution need. |
| `Needs verification` | Repository evidence exists, but MVP readiness or safe integration must be proven before reliance. |

Risk levels: Low, Medium, High, Critical.

## Capture / Import

| Capability | Evidence reviewed | Current status | Truth posture | MVP reuse | Wrapper/gate/ref/evidence needed | Must not assume | Risk | Recommended use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Source URL capture | `apps/platform/app/api/gnr8/agency/clients/[clientId]/sites/import/route.ts`, `apps/platform/gnr8/validation/runtime/url-single-page-import.ts`, MVP-8 closeout | Implemented in canonical client-scoped import | Capture artifact/source evidence | Reuse as evidence only | Future execution cites accepted source evidence review and capture watermarks | Current source website is unchanged since capture | Medium | Baseline refs for proposal and implementation scope |
| Rendered DOM capture | `apps/platform/gnr8/site/scoped-import-pipeline.ts`, `apps/platform/gnr8/import-rendered-capture/**`, MVP-8 closeout | Implemented, can degrade | Evidence artifact | Reuse as evidence only | Require accepted source evidence review; carry degraded limitations | Rendered DOM always exists or is complete | Medium | Compare proposal and improved candidate against captured DOM evidence |
| Screenshot capture | `scoped-import-pipeline.ts`, rendered capture service tests, MVP-8 closeout | Implemented, can degrade | Evidence artifact | Reuse as evidence only | Cite screenshot refs and freshness; do not use as approval | Screenshot is equivalent to visual approval | Medium | Review and visual QA evidence |
| Raw HTML capture | `url-single-page-import.ts`, `scoped-import-pipeline.ts`, worker import contract | Implemented | Source artifact/evidence | Reuse as evidence only | Hash/watermark required | Raw HTML represents post-JS state | Medium | Baseline fallback and source content evidence |
| Text extraction | MVP-8 mapping, worker import contract, scoped pipeline content signals | Implemented/partial by source mode | Evidence artifact | Reuse as evidence only | Cite source evidence category `text` | Extracted text is approved content | Medium | Proposal findings and candidate diff context |
| Image extraction | MVP-8 mapping, worker import contract asset registry, scoped pipeline | Implemented for fetched manifests/assets | Evidence artifact | Reuse as evidence only | Preserve image refs/license/source limitations | Images are licensed or approved for reuse | High | Visual continuity/reference evidence |
| Asset manifest extraction | Worker import contract, scoped import pipeline, runtime raw artifact persistence | Implemented | Artifact/evidence | Reuse behind new adapter | Adapter must copy/bind only immutable artifact refs | All remote assets are fetched and stable | Medium | Input to improved artifact bundle creation |
| Font extraction | MVP-8 category mapping from computed font samples, rendered capture style samples | Partial | Evidence/advisory | Reuse as evidence only | Carry confidence and missing font provenance | Font-family samples prove font file rights or exact identity | High | Brand/typography continuity hint |
| Computed styles | Rendered capture computed style samples, scoped pipeline style signals | Implemented/partial | Evidence/advisory | Reuse as evidence only | Cite sample count and capture quality | Style samples are full design-system truth | Medium | Visual continuity and QA inputs |
| Metadata extraction | URL import metadata and source evidence category mapping | Implemented | Evidence artifact | Reuse as evidence only | Cite metadata refs/watermarks | Metadata is approved SEO output | Medium | Proposal and future implementation target scope |
| Multi-page import/discovery | `apps/platform/gnr8/multipage-import/**`, OP-05, TECH-09 | Partially implemented | Import evidence and route artifact | Reuse behind new adapter | Future executor must preserve supported route map and limitations | Auth/dynamic/commerce multi-page sites are handled | High | Candidate route scope only when source evidence review accepted it |
| Failure diagnostics | Worker import contract diagnostics, multipage diagnostics, MVP-8 closeout | Implemented | Evidence/audit support | Reuse directly as evidence input | Execution must fail closed on blocking diagnostics unless approved limitation exists | Warnings are harmless | Medium | Carry into implementation attempt and review |

## Understanding / Continuity

| Capability | Evidence reviewed | Current status | Truth posture | MVP reuse | Wrapper/gate/ref/evidence needed | Must not assume | Risk | Recommended use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Website Understanding | `source-website-understanding-projection-builder.ts`, OP-06, `SOURCE_WEBSITE_UNDERSTANDING_PROJECTION_RUNTIME.md` | Implemented read-only projection | Projection | Reuse as advisory/projection only | Cite WU projection ref/version when proposal used it | WU is business truth or approval truth | Medium | Operator review and proposal-relevant context |
| Visual Continuity Understanding | `source-content-visual-continuity-projection-builder.ts`, OP-07, `SOURCE_CONTENT_VISUAL_CONTINUITY_PROJECTION_RUNTIME.md` | Implemented read-only projection | Projection/evidence summary | Reuse as advisory/projection only | Cite VCU projection refs; carry limitations | VCU is canonical brand truth or asset approval | High | Continuity checklist for improved candidate review |
| Source content continuity | OP-07 and source content/visual continuity docs/code | Implemented projection | Projection | Reuse as advisory/projection only | Link to accepted source evidence refs | Source wording is approved final content | Medium | Preserve recognizability and avoid invented content |
| Visual continuity scoring | VCU docs/code and visual-analysis modules | Partial/needs verification | Advisory | Needs verification | Future adapter must prove score inputs and thresholds | Score equals acceptance | High | Review aid only until verified |
| CGP/brand extraction | Architecture business/brand artifacts, style signals, OP-08 through OP-12 | Partially implemented/prepared | Advisory artifact | Reuse as evidence only | Cite artifact refs and confidence/limitations | Extracted brand is client-approved brand system | High | Brand continuity input, not source truth |
| Color extraction | Style signals/computed samples, VCU, artifact builder token logic | Implemented/partial | Evidence/advisory | Reuse as evidence only | Cite computed style/source refs | Token candidates are design approval | Medium | Candidate palette constraints |
| Typography/font identity | Rendered computed style samples, VCU | Partial | Evidence/advisory | Reuse as evidence only | Carry font provenance and licensing gaps | CSS family equals usable licensed font | High | Typography continuity hint |
| Image/style consistency | VCU, thumbnails, visual analysis | Partial | Advisory/projection | Reuse as advisory/projection only | Review-only refs and limitations | Consistency projection authorizes reuse | High | Review checklist |
| Business/context understanding | Business Foundation, Business Discovery, DBT/WDB/WGP operator map entries | Partially implemented/prepared | Advisory/planning artifact | Reuse as evidence only | Cite accepted operator/context refs when used | Business context is complete or approved | Medium | Proposal rationale and scope constraints |
| Proposal-relevant understanding artifacts | WU, VCU, Business Foundation, WGP, generated proposal preview docs | Mixed | Projection/advisory | Reuse as advisory/projection only | Include explicit source refs and freshness | Generated/projection artifacts are canonical plan truth | High | Inform proposal recommendations, not execution truth |

## Clone / Runtime

| Capability | Evidence reviewed | Current status | Truth posture | MVP reuse | Wrapper/gate/ref/evidence needed | Must not assume | Risk | Recommended use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Clone executor | `single-site-real-clone-executor.ts`, MVP-12 and MVP-12-VERIFY closeouts | Implemented and runtime-store verified | Canonical candidate runtime version/artifact creation | Reuse behind new adapter | Future improvement executor should mirror its idempotency, watermarks, shadow artifacts, no active pointer switch | Clone executor performs improvement | Low | Pattern for improved candidate version creation |
| Runtime site version creation | `runtime-store.ts:createSiteVersionFromMigration`, MVP-12 | Implemented | Canonical runtime truth | Reuse behind new adapter | Adapter must set candidate state, provenance, semantic watermark, refs | Version creation is safe without execution-time AAF | High | Create new improved candidate only after gate |
| Runtime artifact creation | `runtime-store.ts:createArtifact`, `artifact-builder.ts` | Implemented | Canonical runtime artifact | Reuse behind new adapter | Shadow/review governance, artifact hash, binding refs | Artifact means published | High | Store improved candidate artifact |
| Artifact binding | `runtime-store.ts:bindArtifactToVersion` | Implemented | Canonical runtime binding | Reuse behind new adapter | Bind only candidate artifact to candidate version | Binding changes active serving | Medium | Link improved version to review artifact |
| Public runtime rendering | `apps/platform/app/(public)/[[...slug]]`, `public-runtime-render.tsx` | Implemented | Production serving projection over active pointer/artifacts | Unsafe for MVP execution | Do not call for mutation; use only after publish approval in later phase | Preview/public render equals approval | Critical | Out of scope for improvement execution |
| Preview/staging rendering | `unified-render-preview.ts`, preview route | Implemented | Review projection over persisted artifacts | Reuse directly for review after candidate exists | Candidate version refs and access controls | Preview is content/client/launch/publish approval | Medium | Improved candidate review surface later |
| Content override primitives | Content routes, `runtime-store.ts` override functions, OP-20 | Implemented | Content override truth | Unsafe for MVP execution | Future content implementation needs separate content approval boundary | Draft override save is governed improvement execution | Critical | Do not use in MVP-20 unless scope explicitly chooses content-only adapter |
| Runtime artifact bundle building | `artifact-builder.ts:buildDeterministicArtifactBundle` | Implemented | Implementation artifact builder | Reuse behind new adapter | Improved candidate adapter must define deterministic inputs/diff | Builder understands proposal recommendations | Medium | Build candidate bundle from approved source inputs |

## Proposal / Improvement

| Capability | Evidence reviewed | Current status | Truth posture | MVP reuse | Wrapper/gate/ref/evidence needed | Must not assume | Risk | Recommended use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Generated Website Proposal | Generation validation docs, generated proposal artifacts | Partially implemented/historical proof | Advisory/generated artifact | Reuse as advisory/projection only | Human-reviewed refs only | Generated proposal is production truth | High | Optional evidence, not executor source |
| Generated Proposal Bundle | `generated-proposal-bundle-persistence.ts`, OP-13/OP-14 | Durable preview implemented | Immutable preview artifact | Reuse as evidence only | Cite bundle ref/hash/iteration and label advisory | Bundle output is runtime truth | High | Review/reference only |
| AI transformation plan route | `app/api/gnr8/ai/transformation-plan/route.ts` | Implemented route over page storage | Advisory planning route | Unsafe for MVP execution | Would require tenant/site/proposal/AAF wrapper | Route is canonical proposal planning | High | Do not use directly |
| AI transformation execute route | `app/api/gnr8/ai/transformation-execute/route.ts` | Existing mutation route over page storage | Unsafe mutation surface | Unsafe for MVP execution | Must not be called without new governed adapter and source-truth mapping | `safeBatch` is AAF or implementation authorization | Critical | Exclude from MVP single-site execution |
| Proposal import/build utilities | Generated proposal bundle persistence and proposal planning service | Mixed | Advisory/canonical depending table | Reuse as evidence only for bundles; reuse proposal service refs directly | Must cite approved proposal plan and selected recommendation refs | Import utilities create approved implementation | High | Proposal refs are inputs; bundles are evidence only |
| Twin proposal previews | DBT/twin preview surfaces | Prepared/read-only | Projection | Reuse as advisory/projection only | Ref plus limitations | Twin preview is content or client approval | Medium | Optional operator context |
| Content improvement routes | Content override routes | Implemented mutation | Unsafe mutation surface | Unsafe for MVP execution | Needs separate content approval and content executor | Content edit equals improved candidate version | Critical | Out of scope for MVP-19/MVP-20 execution core |
| Existing generated preview surfaces | Evolution preview routes and thumbnails | Implemented read-only/private | Review projection | Reuse as advisory/projection only | Private, immutable refs | Preview is runtime artifact truth | Medium | Review aid only |

## Governance / Operations

| Capability | Evidence reviewed | Current status | Truth posture | MVP reuse | Wrapper/gate/ref/evidence needed | Must not assume | Risk | Recommended use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AAF approval/evidence/audit | `aaf-contracts.ts`, AAF docs/closeouts, writer/policy facade | Implemented foundation | Approval/evidence/audit truth | Reuse directly for validation; behind executor adapter for writes | Execution-time validator must re-read exact scope and evidence | Attach-time validation remains valid forever | Low | Mandatory gate before future execution |
| Implementation authorization bridge | `implementation-authorization-bridge.ts`, MVP-18 closeout | Implemented non-executing bridge | AAF request/evidence/ref validation helper | Reuse behind new execution validator | Revalidate immediately before mutation; carry limitations | Attached ref authorizes execution by itself | Medium | Input to MVP-20 validator |
| Single-site state spine | MVP-4 through MVP-7 docs/code, transition contract | Implemented core | Migration state/ref truth | Reuse behind new adapter | Future execution states/refs/events must use transition service/persistence | Read model writes truth | Medium | Coarse state transitions and source refs |
| Command Center projections | Command Center docs/code | Implemented/partial | Derived projection | Reuse as advisory/projection only | Future UI can link to source-owned actions | Command Center is source truth | High | Display only after source truth exists |
| Ops Inbox projections | Ops Inbox docs/code | Implemented for derived shell/PASR items | Derived projection | Reuse as advisory/projection only | Stable derived work item keys | Ops dismissal resolves blockers | High | Display-only future routing |
| Publish shadow gate/read model | PASR docs/code | Implemented shadow read model | Shadow/evidence projection | Reuse as evidence only | Must not enforce implementation execution | Publish shadow readiness approves improvement execution | High | Later publish readiness, not MVP execution |
| DDOM readiness snapshots | DDOM docs/code | Implemented persistence/writer/manual trigger | Domain readiness truth for prerequisite snapshots | Reuse as evidence only | Publish/domain stages only; no execution gate unless scope needs domain refs | DDOM is approval | Medium | Out of scope for candidate creation except evidence context |
| PTT publish target truth | PTT closeout/docs | Implemented persistence core | Publish target truth | Reuse as evidence only | Publish-stage only | PTT authorizes publish | Medium | Out of scope for improvement candidate creation |

## Existing Execution Candidate Primitives

| Candidate | Classification | Reason |
| --- | --- | --- |
| Runtime site version creation/copy | Canonical runtime truth; reuse behind new adapter | Safest future primitive when modeled after MVP-12: create a new non-published candidate version from accepted clone baseline and approved recommendation refs. |
| Runtime artifact creation/binding | Implementation artifact; reuse behind new adapter | Safe only when artifact is review/shadow stage, idempotent, scoped, and AAF-gated immediately before write. |
| Content override persistence | Unsafe mutation surface for MVP execution | It writes draft content directly and belongs behind a separate content implementation/content approval boundary. |
| AI transformation execution route | Unsafe mutation surface | It executes transformations over page storage and does not satisfy single-site/AFF/proposal/runtime source-truth requirements. |
| Generated Proposal Bundle import | Generated advisory artifact | Durable and useful for review, but not production/runtime truth. |
| Proposal preview/runtime twin paths | Advisory/projection | Useful context; not canonical output. |
| Manual content editing paths | Unsafe mutation surface for MVP execution | Useful later under content approval, not as initial improvement executor. |
| Generation/evolution primitives | Needs verification/advisory | Many artifacts and dashboards exist, but CAP-1 did not establish a complete governed execution loop. |

## Safest Future Primitive

The safest future primitive is a new server-only improvement execution adapter that mirrors the MVP-12 clone executor discipline:

- accept only an approved/approved-with-limitations proposal plan with selected recommendation refs;
- revalidate AAF at execution time;
- copy the accepted clone runtime baseline into a new improved candidate runtime site version;
- create and bind a review/shadow runtime artifact;
- record implementation attempt, refs, evidence, limitations, semantic input watermark, semantic output watermark, and idempotency;
- never switch the active pointer;
- never publish;
- never mutate the accepted clone version or production version;
- never treat AI/provider output or Generated Proposal Bundle output as execution truth.

## Missing For MVP Execution

- Execution-time AAF validator core for this exact scope.
- Improvement execution persistence for attempts, refs, events, and selected items.
- A new improvement execution adapter boundary over runtime version/artifact primitives.
- Deterministic mapping from approved recommendation ids to candidate-version changes.
- Improved candidate review records distinct from content/client/launch/publish approvals.
- Evidence package/result builder for execution attempts.
- Guardrails preventing direct AI/content/publish route bypass.
