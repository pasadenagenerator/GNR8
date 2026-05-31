# GNR8 THREAD HANDOFF

This is the first file every new ChatGPT/Codex thread should read.

## A) Current Project State

GNR8 is currently in provider/DNS control-plane hardening and migration/preview validation mode.
The active emphasis is deterministic contracts, approval/handoff safety, and no hidden execution.
Twin Runtime Types and Deterministic Builder milestone is complete and verified (implemented runtime files: `apps/platform/gnr8/runtime/twin/twin-types.ts`, `apps/platform/gnr8/runtime/twin/twin-builder.ts`, `apps/platform/gnr8/runtime/twin/twin-builder.test.ts`; implemented types: `TwinIdentity`, `TwinStatus`, `TwinSnapshot`, `TwinMetadata`, `WebsiteDigitalTwin`, `TwinViewerPayload`; implemented functions: `buildWebsiteDigitalTwin(input)` and `toTwinViewerPayload(twin)`; deterministic behavior: `twinId` from `siteId+siteVersionId+environmentScope`, controlled timestamps via `nowIso|clock`, `ready` for valid input, deterministic throws for missing `siteId/siteVersionId`; diagnostics: `TWIN_BUILD_STARTED`, `TWIN_IDENTITY_CREATED`, `TWIN_SNAPSHOT_CREATED`, `TWIN_BUILD_SUCCEEDED`; validation: twin-builder tests passed and `next build` passed; boundaries unchanged: no DB persistence/API/UI, no scoring/recommendations/AI/optimization/publish execution; this milestone's follow-up (Twin In-Memory Store / Read-Model Store) is now complete).
Twin In-Memory Store and Read-Model Repository milestone is complete and verified (implemented runtime files: `apps/platform/gnr8/runtime/twin/twin-store.ts`, `apps/platform/gnr8/runtime/twin/twin-store.test.ts`; implemented interface: `TwinStore`; implemented methods: `saveTwin(twin)`, `getTwin(twinId)`, `getTwinBySiteVersion(siteVersionId)`, `listTwins()`, `clear()`; implemented implementation: `InMemoryTwinStore`; diagnostics: `TWIN_STORE_SAVE_SUCCEEDED`, `TWIN_STORE_GET_SUCCEEDED`, `TWIN_STORE_LIST_SUCCEEDED`; behavior: map-based storage, latest twin per `siteVersionId` tracking, multiple twins supported, twin payloads are not mutated, runtime-memory only; validation: twin-store tests passed and `next build` passed; boundaries unchanged: no database, no Supabase, no persistence, no API routes, no Workspace UI, no scoring, no recommendations, no AI; conclusion: first runtime Twin Repository layer for storing/retrieving Website Digital Twins in memory is now in place; success criteria: future bootstrap resumes from Twin Builder + InMemoryTwinStore as the minimal Twin runtime foundation).
Twin Viewer Read-Model Helper milestone is complete and verified (implemented runtime files: `apps/platform/gnr8/runtime/twin/twin-viewer.ts`, `apps/platform/gnr8/runtime/twin/twin-viewer.test.ts`; implemented type: `TwinOverview`; implemented function: `createTwinOverview(twin)`; mapped fields: `twinId`, `siteId`, `siteVersionId`, `workspaceId`, `environmentScope`, `status`, `contentSummary`, `designSummary`, `experienceSummary`, `governanceSummary`, `operationalSummary`, `lastUpdated`, `diagnostics`; implemented diagnostic: `TWIN_OVERVIEW_CREATED`; validation: twin-viewer tests passed and `next build` passed; boundaries unchanged: no Workspace UI yet, no React, no database, no API, no AI, no optimization, no scoring, no recommendations; conclusion: GNR8 now has a Workspace-ready Twin Overview read-model capable of presenting Website Digital Twin state before UI implementation; recommended next milestone: Workspace Overview Twin Preview UI; success criteria: future bootstrap resumes from Twin Builder + InMemoryTwinStore + TwinOverview read-model).
Workspace Overview Twin Preview UI milestone is complete and verified (route: `/gnr8/admin/twin-preview`; runtime chain: `buildWebsiteDigitalTwin()` -> `InMemoryTwinStore` -> `getTwinBySiteVersion()` -> `createTwinOverview()` -> browser-rendered read-only preview; verified deployed values: `title=Website Digital Twin Runtime Preview`, `subtitle=Read-only validation surface`, `status=ready`, `environmentScope=preview`, `contentSummary=pages=1; sections=8; detectedTitle=Northstar Widgets — Simple Marketing Site; homepagePath=index.html`, `designSummary=assets=5; layoutEvidence=available`, `experienceSummary=navigationEvidence=available; homepageDetected=true`, `governanceSummary=sourceImportId=import_real-site-01_c167859409d8; sourceSiteVersionId=site_version_real-site-01_072929becae7; readOnly=true`, `operationalSummary=environmentScope=preview; providerState=preview/runtime-only`; diagnostics: `TWIN_BUILD_STARTED`, `TWIN_IDENTITY_CREATED`, `TWIN_SNAPSHOT_CREATED`, `TWIN_BUILD_SUCCEEDED`, `TWIN_STORE_SAVE_SUCCEEDED`, `TWIN_STORE_GET_SUCCEEDED`, `TWIN_STORE_LIST_SUCCEEDED`, `TWIN_OVERVIEW_CREATED`; boundaries: read-only validation surface with no editing/actions/forms/publish/AI/scoring/recommendations; conclusion: GNR8 now has the first browser-visible Website Digital Twin runtime surface; recommended next milestone: Workspace Navigation Wiring; success criteria: future bootstrap resumes from Twin Builder + InMemoryTwinStore + getTwinBySiteVersion + TwinOverview preview route).
Twin Snapshot Hydration from Imported Site Model milestone is complete and verified (route: `/gnr8/admin/twin-preview-real`; source fixture: `real-site-01`; runtime chain: `real-site-01 fixture` -> `buildWebsiteDigitalTwin()` -> `InMemoryTwinStore` -> `getTwinBySiteVersion()` -> `createTwinOverview()` -> browser-rendered read-only preview; verified values: `title=Website Digital Twin Runtime Preview (Real Site)`, `sourceSiteVersionId=site_version_real-site-01_072929becae7`, `sourceImportId=import_real-site-01_c167859409d8`, `status=ready`, `environmentScope=preview`, `contentSummary=pages=1; sections=8; detectedTitle=Northstar Widgets — Simple Marketing Site; homepagePath=index.html`, `designSummary=assets=5; layoutEvidence=available`, `experienceSummary=navigationEvidence=available; homepageDetected=true`, `governanceSummary=sourceImportId=import_real-site-01_c167859409d8; sourceSiteVersionId=site_version_real-site-01_072929becae7; readOnly=true`, `operationalSummary=environmentScope=preview; providerState=preview/runtime-only`; diagnostics: `TWIN_BUILD_STARTED`, `TWIN_IDENTITY_CREATED`, `TWIN_SNAPSHOT_CREATED`, `TWIN_BUILD_SUCCEEDED`, `TWIN_STORE_SAVE_SUCCEEDED`, `TWIN_STORE_GET_SUCCEEDED`, `TWIN_STORE_LIST_SUCCEEDED`, `TWIN_OVERVIEW_CREATED`; boundaries: read-only validation surface with no editing/publish/AI/scoring/recommendations and no DB/schema changes; conclusion: GNR8 now proves an imported real-site fixture can become a visible Website Digital Twin runtime surface with evidence-hydrated read-model summaries; deterministic placeholder summaries remain fallback-only when evidence input is omitted; recommended next milestone: Workspace Navigation Wiring; success criteria: future bootstrap resumes from Twin Builder + InMemoryTwinStore + getTwinBySiteVersion + TwinOverview + real-site fixture preview route).
Twin Snapshot Hydration implemented evidence fields are now documented as `pageCount`, `sectionCount`, `assetCount`, `detectedTitle`, `detectedHomepagePath`, and `providerStateSummary`.
Twin Snapshot Hydration boundary is unchanged: no scoring, no recommendations, no AI, no optimization, no editing, no publishing.
Twin Snapshot Hydration conclusion: Digital Twin snapshots now contain imported-site evidence instead of placeholder-only summaries.
Twin Runtime Contract milestone is complete and verified as canonical contract baseline (`docs/architecture/TWIN_RUNTIME_CONTRACT.md` is now the canonical implementation source for first operational Website Digital Twin runtime objects; contract scope covers Twin Identity, Twin Status, Twin Snapshot, Twin Metadata, Twin Store rules, Twin Viewer payload, and Workspace Overview integration boundary; canonical identity fields are `twinId`, `siteId`, `siteVersionId`, `workspaceId`, `environmentScope`, `status`, `createdAt`, `updatedAt`; status lifecycle is `building|ready|stale|failed`; snapshot fields are `contentState`, `designState`, `experienceState`, `governanceState`, `operationalState`; metadata fields are `sourceImportId`, `sourceSiteVersionId`, `sourceModels`, `generatedAt`, `generatedBy`, `diagnostics`; storage rules are immutable per site version with stale marking allowed and failed generation diagnostics required; viewer payload contract is `identity/status/snapshot/metadata/diagnostics`; explicit out-of-scope includes scoring, recommendations, optimization, proposal generation, publish execution, runtime observation engine, and runtime optimization engine; runtime baseline now includes implemented twin types/builder with persistence/API/UI still intentionally out of scope).
First Operational Twin Roadmap Draft milestone is complete and verified as documentation-only (`docs/architecture/FIRST_OPERATIONAL_TWIN_ROADMAP.md` is now the canonical minimal implementation slice for first visible Twin runtime value; target outcome is website imported -> twin generated -> twin stored -> twin displayed in Workspace Overview; required components are Twin Identity, Twin Snapshot, Twin Builder, Twin Store, Twin Viewer, and Workspace Overview Integration; canonical inputs are Import Pipeline, Canonical Models, Site Version, and Provider State; canonical outputs are Twin Snapshot, Twin Metadata, and Twin State Summary; out-of-scope boundary is explicit for scoring/recommendations/optimization/AI editing/publish automation; no runtime/API/UI/database implementation changes).
Provider Governance Cockpit v1 / Section Ordering Pass milestone is complete and verified (Provider Fleet has been consolidated into a coherent governance-first cockpit on `/gnr8/admin/providers` rather than an accumulated list of provider surfaces; visible-by-default canonical order is `Operational Snapshot`, `Provider Execution Governance Chain Preview`, `Provider Category Summary`, `Environment Awareness Preview`, `Provider Credential Boundary Preview`, `Provider Credential Boundary Advisor`, and `AI Routing Readiness Advisor`; collapsible detail canonical order is `Provider Registry Details`, `AI Provider Capability Matrix`, `AI Routing Policy Preview`, `AI Routing Evaluator Preview`, `Credential Reference Registry Preview`, `Provider Capability Status`, and `Realtime Register Contract Readiness`; UI/read-model only; no runtime/API changes; no provider execution; no writes; no secret resolution; no AI model calls; recommended next milestone options: Founder Docs Canonical Repo Commit, AI Credential Boundary Preview, Second Real Provider Read-only Connector; success criteria: future bootstrap resumes from Provider Governance Cockpit v1 as the canonical Provider Fleet UX baseline).
Provider Contract Registry Extraction milestone is complete and verified (Provider Fleet no longer depends on inline UI provider definitions; canonical provider contract registry now drives provider fleet read-model rendering; no runtime/API/provider execution changes).
AI Provider Capability Matrix UI milestone is complete and verified (Provider Fleet now exposes read-only AI provider routing metadata in `AI Provider Capability Matrix` on `/gnr8/admin/providers` for OpenAI/Anthropic/Gemini/Groq/Mistral including model families, strengths, routing hints, latency class, cost class, and context window class; advisory metadata only; no model calls performed; UI/read-model only; no runtime AI orchestration, no API changes, no execution, no secrets, no action buttons/forms).
AI Routing Policy Registry Extraction milestone is complete and verified (Provider Fleet `AI Routing Policy Preview` now consumes canonical read-model registry rows from `apps/platform/gnr8/runtime/providers/ai-routing-policy-registry.ts`; preferred/secondary provider names resolve from `provider-contract-registry` where possible; all row execution states are `preview_only`; no runtime AI routing, no live model calls, no API changes, no execution controls/forms).
AI Routing Policy Preview / Task-to-Provider Mapping Matrix milestone is complete and verified (Provider Fleet now includes `AI Routing Policy Preview` on `/gnr8/admin/providers` with strategic task-to-provider mappings across OpenAI/Anthropic/Gemini/Groq/Mistral; advisory strategy only; no live AI routing performed; UI/read-model/docs only; no runtime AI orchestration, no API changes, no execution, no secrets, no action buttons/forms).
AI Routing Readiness Advisor milestone is complete and verified (Provider Fleet now includes `AI Routing Readiness Advisor` with explicit current state, limitations, missing requirements, and next-step guidance; badge mapping reflects success/warning/critical readiness semantics; UI/read-model only; no runtime AI routing, no live model calls, no API changes, no execution controls/forms).
AI Routing Evaluator Preview Model milestone is complete and verified (deterministic preview evaluator implemented in `apps/platform/gnr8/runtime/providers/ai-routing-evaluator-preview.ts` with test coverage in `apps/platform/gnr8/runtime/providers/ai-routing-evaluator-preview.test.ts`; evaluator matches `taskType` against `AI_ROUTING_POLICY_PREVIEW_REGISTRY`, uses preferred/secondary providers when matched, defaults to `openai` + `anthropic` fallback when unmatched, resolves `selectedModelFamily` from provider registry metadata, applies request preferences as constraints, always emits `execution_blocked` and `preview_only` diagnostics context, and always returns `executionAllowed:false` and `executionBlocked:true`; preview evaluator tests passed and next build passed; deterministic preview only, no model calls, no credential resolution, no provider dispatch, no runtime execution, no API endpoint yet).
AI Routing Evaluator Preview UI milestone is complete and verified (Provider Fleet now includes `AI Routing Evaluator Preview` in `apps/platform/app/gnr8/admin/providers/ai-routing-evaluator-preview.tsx`, mounted in `provider-fleet-view.tsx`, with deterministic local task selector preview for `site_migration_planning`, `long_architecture_review`, `layout_visual_understanding`, `fast_interactive_generation`, `eu_sensitive_workloads`, and `structured_tool_orchestration`; preview result includes provider/model/strategy/fallback/reason/constraints/diagnostics and execution state is always visibly blocked; advisory text explicitly states deterministic non-executable preview and no AI providers called; no runtime execution/model calls/provider dispatch/API execution layer).
Provider Fleet Operational Snapshot milestone is complete and verified (Provider Fleet now includes visible-by-default `Operational Snapshot` above detailed sections on `/gnr8/admin/providers` with compact control-plane overview cards for `Control Plane Status`, `Connected Providers`, `Operational Read-only Capabilities`, `AI Routing Preview`, `Execution Layer`, `Governance State`, and `Recommended Next Step`; verified values are `Operational (read-only)`, connected providers derived from registry totals, operational read-only capabilities derived from registry capabilities, `AI Routing Preview: Available`, `Execution Layer: Blocked`, and `Governance State: Preview / non-executable`; derivation model is registry-driven + boundary-driven + evaluator/policy-registry-driven with no hardcoded totals where possible; no forms/buttons/actions/execution controls added; Provider Category Summary, AI Routing Readiness Advisor, Openprovider links, evaluator preview, and collapsible detail sections preserved; UI/read-model/tests/docs only; no runtime/provider/API/write/queue/worker/model-call changes; conclusion: Provider Fleet now exposes an executive operational overview above all detailed provider and AI orchestration surfaces; recommended next milestone: Provider Fleet Multi-Tenant / Environment Awareness; success criteria: future bootstrap resumes from Provider Fleet Operational Snapshot milestone).
Provider Fleet UI Density / Collapsible Sections milestone is complete and verified (Provider Fleet now renders governance-first with visible-by-default section order `Operational Snapshot`, `Provider Execution Governance Chain Preview`, `Provider Category Summary`, `Environment Awareness Preview`, `Provider Credential Boundary Preview`, `Provider Credential Boundary Advisor`, and `AI Routing Readiness Advisor`; dense sections are collapsible by default via native `details/summary` labels in deterministic order: `Provider Registry Details`, `AI Provider Capability Matrix`, `AI Routing Policy Preview`, `AI Routing Evaluator Preview`, `Credential Reference Registry Preview`, `Provider Capability Status`, and `Realtime Register Contract Readiness`; no content removed, no behavior removed, no new actions/forms/buttons, Openprovider link preserved, evaluator preview preserved, category summary preserved; UI/read-model/tests/docs only; no runtime/provider/API/write/queue/worker/model-call changes).
Provider Fleet Category Summary Cards milestone is complete and verified (Provider Fleet now includes `Provider Category Summary` in `apps/platform/app/gnr8/admin/providers/provider-fleet-view.tsx`, with one card per provider category showing category label, total providers, connected providers, preview/read-model capabilities count, and category execution status; current expected examples: registrar `4/1/3/blocked`, AI `5/0/10/blocked`, communication `3/0/0/blocked`, ERP/accounting `1/0/0/blocked`; no execution controls/actions/forms added; UI/read-model/docs only; no runtime/provider/API/write/queue/worker/model-call changes).
Provider Fleet Environment Awareness Preview milestone is complete and verified (Provider Fleet now includes visible-by-default `Environment Awareness Preview` in `apps/platform/app/gnr8/admin/providers/provider-fleet-view.tsx`; provider contract registry now includes `environmentScope` and `bindingScope` metadata in `apps/platform/gnr8/runtime/providers/provider-contract-registry.ts`; scope vocabularies are explicit and read-model-only; current expected mapping: Openprovider `environmentScope:sandbox` + `bindingScope:global`, placeholder providers `environmentScope:global` + `bindingScope:global`; advisory note explicitly states governance preview only with no tenant credentials managed and no provider execution performed; no forms/buttons/actions added; UI/read-model/tests/docs only; no runtime/provider/API/write/queue/worker/model-call changes).
Provider Credential Boundary Preview milestone is complete and verified (Provider Fleet now includes visible-by-default `Provider Credential Boundary Preview` in `apps/platform/app/gnr8/admin/providers/provider-fleet-view.tsx`; canonical provider contracts now include `credentialBoundary` metadata in `apps/platform/gnr8/runtime/providers/provider-contract-registry.ts` with `credentialsRequired`, `credentialStatus`, `secretResolution`, and `bindingRequired`; summary cards render providers requiring credentials, configured references, missing references, secret resolution state, and binding required; compact per-category credential breakdown renders total/configured/missing/secret-resolution-disabled counts; current expected mapping: Openprovider `credentialStatus:configured_reference_only`, placeholders `credentialStatus:missing`, and `secretResolution:disabled` for all providers; advisory note explicitly states read-only preview and no secrets stored/resolved/exposed; no forms/buttons/actions added; UI/read-model/tests/docs only; no runtime/provider/API/write/queue/worker/model-call changes).
Provider Credential Boundary Advisor milestone is complete and verified (Provider Fleet now includes visible-by-default `Provider Credential Boundary Advisor` in `apps/platform/app/gnr8/admin/providers/provider-fleet-view.tsx` with governance cards for `Current State`, `Current Limitations`, `Missing Requirements`, and `Recommended Next Step`; card items explicitly document modeled references, preview availability, disabled secret resolution, blocked execution, missing governance architecture requirements, and recommended contract-first next steps while keeping execution blocked; advisory note explicitly states credential governance is preview-only and no secrets are stored/resolved/exposed; no forms/buttons/actions added; UI/read-model/tests/docs only; no credential storage/secret management/secret resolution/provider execution/writes).
Provider Execution Governance Chain Preview milestone is complete and verified (Provider Fleet now includes visible-by-default `Provider Execution Governance Chain Preview` in `apps/platform/app/gnr8/admin/providers/provider-fleet-view.tsx` with six explicit stages and current states: `Provider Contract` (`modeled`), `Credential Reference` (`previewed`), `Secret Resolution` (`design_only_disabled`), `Authorization Context` (`design_only_not_issued`), `Execution Approval` (`design_only_not_requested`), and `Execution` (`blocked`); stage badge mapping is explicit (success for modeled/previewed, warning for design-only states, critical for blocked); advisory note explicitly states governance preview only and that no secrets, approvals, authorization contexts, or executions are created; no forms/buttons/actions added; UI/read-model/tests/docs only; no runtime/provider/API/write/queue/worker/model-call changes).
Experience Workspace Architecture Draft milestone is complete and verified as documentation-only (`docs/architecture/EXPERIENCE_WORKSPACE_ARCHITECTURE.md` is now the canonical workspace architecture defining workspace purpose, areas, responsibilities, identity fields, relationship graph, AI assistant governance boundary, governance principles, current architecture-only state, and future integration anchors; no runtime/API/UI/editor/database implementation changes).
Workspace Information Architecture Draft milestone is complete and verified as documentation-only (`docs/architecture/WORKSPACE_INFORMATION_ARCHITECTURE.md` is now the canonical workspace information architecture defining workspace areas, navigation model, homepage information surfaces, content/design/experience/governance/AI information domains, current architecture-only boundaries, and success condition before first workspace UI design; no runtime/UI/editor/API/database implementation changes).
Workspace UI Concept Architecture Draft milestone is complete and verified as documentation-only (`docs/architecture/WORKSPACE_UI_CONCEPT_ARCHITECTURE.md` is now the canonical workspace UI concept architecture defining workspace purpose, philosophy, primary areas, overview-as-digital-twin surfaces, navigation concept, AI governed-editor boundaries, governance domains, operations domains, architecture-only constraints, and the conceptual baseline that wireframe specs build on; no runtime/API/UI implementation/database changes).
Website Digital Twin Architecture Draft milestone is complete and verified as documentation-only (`docs/architecture/DIGITAL_TWIN_ARCHITECTURE.md` is now the canonical architecture document defining the Website Digital Twin as the continuously updated operational representation of a website, with canonical twin domains, twin identity, twin relationships to content/design/experience/workspace/intelligence/governance/operations layers, twin observations, score surfaces, AI and governance boundaries, and architecture-only current state; no runtime/API/UI/database implementation changes; no twin runtime, no scoring engine, and no recommendation engine implemented yet).
Twin Generation Architecture Draft milestone is complete and verified as documentation-only (`docs/architecture/TWIN_GENERATION_ARCHITECTURE.md` is now the canonical architecture document defining how websites become Website Digital Twins from imported evidence, canonical models, and intelligence observations through staged generation from import to twin assembly; architecture/docs only; no runtime/API/UI/database implementation changes; no twin generation runtime, no scoring engine, and no observation engine implemented yet).
Twin Observation Architecture Draft milestone is complete and verified as documentation-only (`docs/architecture/TWIN_OBSERVATION_ARCHITECTURE.md` is now the canonical observation architecture document defining observation purpose, observation inputs, canonical observation types, observation flow from signals to proposal candidates, observation severity levels, AI interpretation/recommendation assistance boundary, governance sequencing, architecture-only current state, and integration anchors; no runtime/API/UI/database implementation changes; no observation runtime and no recommendation runtime implemented yet).
Twin Optimization Architecture Draft milestone is complete and verified as documentation-only (`docs/architecture/TWIN_OPTIMIZATION_ARCHITECTURE.md` is now the canonical optimization architecture document defining optimization purpose, optimization inputs, optimization types, optimization opportunity structure, prioritization dimensions, optimization opportunity to proposal candidate generation, AI optimization/prioritization assistance boundary, governance sequencing, architecture-only current state, and integration anchors; no runtime/API/UI/database implementation changes; no optimization runtime and no prioritization engine implemented yet).
Website Intelligence Architecture Draft milestone is complete and verified as documentation-only (`docs/architecture/WEBSITE_INTELLIGENCE_ARCHITECTURE.md` is now the canonical intelligence architecture defining observation-and-understanding domains, canonical signals, score surfaces, recommendation progression, and explicit AI publish boundary for the Website Overview Digital Twin; architecture/docs only; no runtime/UI/API/database implementation changes; no scoring engine and no recommendation engine implemented yet).
Workspace Wireframes v1 Draft milestone is complete and verified as documentation-only (`docs/product/WORKSPACE_WIREFRAMES_V1.md` is now the canonical first structural workspace wireframe specification covering Website Overview, Content Workspace, Design Workspace, Experience Workspace, Governance Workspace, AI Workspace, and Operations Workspace with required sections for purpose, primary objects, information hierarchy, left navigation, center area, right context panel, actions, and AI surfaces; no runtime/API/UI implementation/database changes).
Content & Experience Governance Architecture Draft milestone is complete and verified as documentation-only (`docs/architecture/CONTENT_EXPERIENCE_GOVERNANCE_ARCHITECTURE.md` is now the canonical parent architecture for how websites are represented, edited, versioned, governed, and published across Content/Design/Experience/Editing/Publish layers with explicit governance principles and child architecture anchors; no runtime/API/UI/editor implementation changes).
AI Editor Architecture Draft milestone is complete and verified as documentation-only (`docs/architecture/AI_EDITOR_ARCHITECTURE.md` is now the canonical editing architecture for governed proposal-first editing across Content/Design/Experience models with explicit editor types, editing targets, editing operations, proposal model, proposal lifecycle, human + AI intent modes, governance principles, current architecture-only boundaries, and future integration anchors; no runtime/API/UI/editor/database changes).
Canonical Content Model Architecture Draft milestone is complete and verified as documentation-only (`docs/architecture/CANONICAL_CONTENT_MODEL.md` is now the canonical content architecture child document defining structured/governed/versionable website content, core content entities, content types, content identity fields, content relationship patterns, governance principles, AI editing implications, current architecture-only boundaries, and future integration anchors; no runtime/API/UI/editor/database changes).
Canonical Design Model Architecture Draft milestone is complete and verified as documentation-only (`docs/architecture/CANONICAL_DESIGN_MODEL.md` is now the canonical design architecture child document defining design as reusable experience structure, core design entities, design responsibilities, design identity fields, design relationship chain, governance principles, AI design editing intent, content-design separation, current architecture-only boundaries, and future integration anchors; no runtime/API/UI/editor/database changes).
Canonical Experience Model Architecture Draft milestone is complete and verified as documentation-only (`docs/architecture/CANONICAL_EXPERIENCE_MODEL.md` is now the canonical experience architecture child document defining experience as user movement through a digital system, core experience entities, experience types, experience identity fields, experience relationship chain, governance principles, AI experience editing intents, content-design-experience separation, current architecture-only boundaries, and future integration anchors; no runtime/API/UI/editor/database changes).
Versioning & Rollback Architecture Draft milestone is complete and verified as documentation-only (`docs/architecture/VERSIONING_ROLLBACK_ARCHITECTURE.md` is now the canonical architecture document defining versioned models, version identity, change sets, rollback model, version lifecycle, rollback lifecycle, governance principles, and AI editing relationship for governed website evolution and first-class rollback safety; architecture/docs only; no runtime/API/UI/database/editor implementation changes).
Publish Governance Architecture Draft milestone is complete and verified as documentation-only (`docs/architecture/PUBLISH_GOVERNANCE_ARCHITECTURE.md` is now the canonical publish governance architecture document defining publish purpose, targets, inputs, publish plan, publish lifecycle, environment promotion chain, governance principles, AI editing publish boundary, current state, and future integration points; architecture/docs only; no runtime/API/UI/database/publish implementation changes).
Authorization Context Contract Draft milestone is complete and verified as documentation-only (`docs/architecture/AUTHORIZATION_CONTEXT_CONTRACT.md` is now the canonical contract for temporary/scoped/redacted provider authorization contexts, core fields, lifecycle states, safety requirements, and explicit boundaries; no runtime/database/API/secret resolution/provider execution changes).
Execution Approval Contract Draft milestone is complete and verified as documentation-only (`docs/architecture/EXECUTION_APPROVAL_CONTRACT.md` is now the canonical contract for governed execution approval decisions, core fields, approval types, lifecycle states, safety requirements, and explicit boundaries; no runtime/database/API/provider execution changes).
Credential Reference Contract Draft milestone is complete and verified as documentation-only (`docs/architecture/CREDENTIAL_REFERENCE_CONTRACT.md` is now the canonical contract for credential reference metadata, core fields, ownership scopes, states, and explicit boundaries; no runtime/database/API/secret storage/secret resolution/provider execution changes).
Credential Reference Registry Preview milestone is complete and verified (deterministic read-model registry implemented in `apps/platform/gnr8/runtime/providers/credential-reference-registry-preview.ts` with test coverage in `apps/platform/gnr8/runtime/providers/credential-reference-registry-preview.test.ts`; Provider Fleet now includes collapsible `Credential Reference Registry Preview` section with summary counts for total/configured/missing/secret-resolution-disabled/execution-blocked references and a table for provider, binding scope, environment scope, secret type, status, resolution state, and execution; advisory note explicitly states metadata only and no secrets stored/resolved/exposed; all preview references are execution-blocked with secret resolution disabled; read-model/UI/docs only; no database changes, no APIs, no secret storage, no secret resolution, no provider execution, no writes).
Global Provider Taxonomy Expansion milestone is complete and verified (Provider Fleet now operates as the Global Provider Control Plane taxonomy across registrar, deployment, communication, ERP/accounting, edge infrastructure, commerce, execution, source control, AI, storage, and identity provider categories; registry/docs/read-model only; no runtime/API/provider execution changes).
Provider Orchestration Contract Architecture Draft milestone is complete and verified as documentation-only (first canonical multi-provider orchestration contract; no runtime/API/provider execution changes).
Second Provider Placeholder Readiness Contract milestone is complete and verified (Realtime Register placeholder now rendered with explicit orchestration contract/readiness/boundary/identity fields and provider-specific readiness advisor text in Provider Fleet Cockpit; UI/read-model only; no runtime/API/provider execution changes).
Provider Fleet Cockpit milestone is complete and verified (global provider control plane route with deterministic seeded provider registry, UI/read-model only, execution blocked).
Provider Navigation Wiring milestone is complete and verified (agency dashboard to provider fleet, provider fleet to Openprovider cockpit, and cockpit links into read-only provider surfaces).
Provider Capability Detail Cards / Readiness Explainer milestone is complete and verified (provider capability guidance layer on `/gnr8/admin/providers` and `/gnr8/admin/providers/openprovider` with status/explanation/readiness semantics for domains, dns, availability, registration, and execution).
Provider Readiness Advisor Layer milestone is complete and verified (operator guidance/readiness interpretation layer on `/gnr8/admin/providers` and `/gnr8/admin/providers/openprovider`; UI/read-model only; execution blocked).
Openprovider Availability Search Panel milestone is complete and verified (read-only GET availability search on `/gnr8/admin/providers/openprovider` using `?domain=<domain>` with default fallback `levi-testis.com`; real sandbox availability lookups visible in cockpit UI; no write or registration paths).
Openprovider Domain Availability Read-only Connector milestone is complete and verified (real provider-read availability check with shared sandbox auth, execution still blocked).
Openprovider Domain Inventory Admin UI milestone is complete and verified (real provider-read UI surface with sandbox auth + read-only inventory, execution still blocked).
Openprovider DNS Inventory Admin UI milestone is complete and verified (real provider-read UI surface with sandbox auth + read-only DNS inventory, execution still blocked).
Openprovider DNS Records Read-only Connector milestone is complete and verified (sandbox auth + read-only DNS inventory, execution still blocked).
Provider handoff readiness with Execution Job Shape Preview / Planned Job Materialization Contract milestone is complete and testable end-to-end from deployed UI (seed + inspection surfaces), and execution remains explicitly blocked.
The deployed dev-seed governance loop is manually verified end-to-end including governance decision package surfaces (still control-plane only).
Provider Execution Contract Envelope / Worker Payload Contract Preview milestone is implemented, deployed, and manually verified (still control-plane only, no execution).
Provider Execution Safety Manifest / No-Execution Boundary Proof milestone is implemented, deployed, and manually verified (still control-plane only, no execution).
Evidence Surface Consolidation / Operator Cockpit Layout Pass milestone is implemented, deployed, and manually verified (UI/read-model only, still control-plane only, no execution).
Operator Cockpit Evidence Status Badges / Severity System milestone is implemented, deployed, and manually verified (UI/read-model only, still control-plane only, no execution).
Operator Evidence Provenance Layer milestone is implemented, deployed, and manually verified (UI/read-model only, still control-plane only, no execution).

Current snapshot sources:
- `docs/architecture/FIRST_OPERATIONAL_TWIN_ROADMAP.md`
- `docs/architecture/TWIN_RUNTIME_CONTRACT.md`
- `docs/architecture/TWIN_GENERATION_ARCHITECTURE.md`
- `docs/architecture/TWIN_OBSERVATION_ARCHITECTURE.md`
- `docs/architecture/TWIN_OPTIMIZATION_ARCHITECTURE.md`
- `docs/architecture/DIGITAL_TWIN_ARCHITECTURE.md`
- `docs/architecture/WEBSITE_EVOLUTION_LIFECYCLE_ARCHITECTURE.md`
- `docs/architecture/WEBSITE_INTELLIGENCE_ARCHITECTURE.md`
- `docs/architecture/WORKSPACE_UI_CONCEPT_ARCHITECTURE.md`
- `docs/architecture/EXPERIENCE_WORKSPACE_ARCHITECTURE.md`
- `docs/architecture/WORKSPACE_INFORMATION_ARCHITECTURE.md`
- `docs/architecture/CONTENT_EXPERIENCE_GOVERNANCE_ARCHITECTURE.md`
- `docs/architecture/AI_EDITOR_ARCHITECTURE.md`
- `docs/architecture/CANONICAL_EXPERIENCE_MODEL.md`
- `docs/architecture/VERSIONING_ROLLBACK_ARCHITECTURE.md`
- `docs/architecture/PUBLISH_GOVERNANCE_ARCHITECTURE.md`
- `docs/architecture/SECRET_RESOLUTION_ARCHITECTURE.md`
- `docs/ai/GNR8_CURRENT_STATE.md`
- `docs/architecture/PROVIDER_ORCHESTRATION_CONTRACT.md`
- `docs/architecture/AI_ROUTING_EVALUATOR_CONTRACT.md`
- `docs/architecture/AI_PROVIDER_ROUTING_ARCHITECTURE.md`
- `docs/product/WORKSPACE_WIREFRAMES_V1.md`
- `docs/gnr8/dns-provider-control-plane-checkpoint-2026-05.md`
- `docs/gnr8/runtime-domain-dns-readiness-baseline-2026-05.md`

## B) Canonical Docs

Read these as the canonical bootstrap set:
- `docs/ai/GNR8_THREAD_HANDOFF.md`
- `docs/architecture/TWIN_RUNTIME_CONTRACT.md`
- `docs/architecture/TWIN_GENERATION_ARCHITECTURE.md`
- `docs/architecture/TWIN_OBSERVATION_ARCHITECTURE.md`
- `docs/architecture/TWIN_OPTIMIZATION_ARCHITECTURE.md`
- `docs/architecture/DIGITAL_TWIN_ARCHITECTURE.md`
- `docs/architecture/WEBSITE_EVOLUTION_LIFECYCLE_ARCHITECTURE.md`
- `docs/architecture/WEBSITE_INTELLIGENCE_ARCHITECTURE.md`
- `docs/ai/GNR8_MASTER_CONTEXT_BOOTSTRAP.md`
- `docs/ai/GNR8_CURRENT_STATE.md`
- `docs/architecture/WORKSPACE_UI_CONCEPT_ARCHITECTURE.md`
- `docs/product/WORKSPACE_WIREFRAMES_V1.md`
- `docs/architecture/EXPERIENCE_WORKSPACE_ARCHITECTURE.md`
- `docs/architecture/WORKSPACE_INFORMATION_ARCHITECTURE.md`
- `docs/architecture/CONTENT_EXPERIENCE_GOVERNANCE_ARCHITECTURE.md`
- `docs/architecture/AI_EDITOR_ARCHITECTURE.md`
- `docs/architecture/CANONICAL_EXPERIENCE_MODEL.md`
- `docs/architecture/VERSIONING_ROLLBACK_ARCHITECTURE.md`
- `docs/architecture/PUBLISH_GOVERNANCE_ARCHITECTURE.md`
- `docs/architecture/PROVIDER_ORCHESTRATION_CONTRACT.md`
- `docs/architecture/CREDENTIAL_REFERENCE_CONTRACT.md`
- `docs/architecture/AUTHORIZATION_CONTEXT_CONTRACT.md`
- `docs/architecture/EXECUTION_APPROVAL_CONTRACT.md`
- `docs/architecture/SECRET_RESOLUTION_ARCHITECTURE.md`
- `docs/architecture/AI_PROVIDER_ROUTING_ARCHITECTURE.md`
- `docs/architecture/AI_ROUTING_EVALUATOR_CONTRACT.md`
- `docs/ai/GNR8_TASK_EXECUTION_PROTOCOL.md`
- `docs/ai/GNR8_COLLABORATION_PROTOCOL.md`
- `docs/ai/GNR8_PROJECT_MAP.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`
- `docs/ai/decisions/ADR-001-deterministic-pipeline.md`
- `docs/ai/decisions/ADR-002-preview-assets-architecture.md`
- `docs/ai/decisions/ADR-003-runtime-artifact-model.md`

Read `docs/ai/GNR8_COLLABORATION_PROTOCOL.md` before generating Codex tasks.

## C) Rules

- Slovenian conversation.
- English Codex tasks.
- step-by-step work.
- deterministic contracts.
- no hidden execution.
- no autonomous live execution.

## D) Current Architecture Status

- Architectural baseline remains modular monolith + service-layer discipline (`SYSTEM.md`, `architecture.md`).
- GNR8 runtime/control-plane work lives primarily under `apps/platform/gnr8/runtime/**`.
- Migration/import/validation subsystems are active and contract-driven (`apps/platform/gnr8/migration/**`, `apps/platform/gnr8/import/**`, `apps/platform/gnr8/validation/**`).

## E) Current Provider-Control-Plane Status

Implemented control-plane layers include provider settings, credential references contract, provider selection/communicator, job planner/repository foundation, approval artifacts/transitions, execution handoff, and worker pickup readiness checks.
Readiness inspection now includes deterministic `workerPickupEvidence` projection from persisted `handoffArtifact`, read-only API inspection route, internal debug UI route, deployed superadmin readiness-test UI, admin seed API for deterministic persisted handoff creation/reuse, operator review intent persistence/creation surfaces, and deterministic governance snapshot surfacing.

Completed readiness inspection routes:
- `GET /api/gnr8/runtime/provider-handoffs/[handoffId]/readiness` (read-only)
- `/gnr8/admin/provider-handoffs/[handoffId]/readiness` (internal debug UI)
- `/gnr8/admin/provider-handoffs/readiness-test` (deployed superadmin readiness test UI)
- `POST /api/gnr8/admin/provider-handoffs/readiness-seed` (admin seed API)
- `GET /api/gnr8/admin/provider-handoffs/[handoffId]/reviews` (read-only operator reviews)
- `POST /api/gnr8/admin/provider-handoffs/[handoffId]/reviews` (admin-only operator review intent creation)
- `GET /api/gnr8/admin/provider-handoffs/[handoffId]/authorization` (read-only governance authorization)
- `POST /api/gnr8/admin/provider-handoffs/[handoffId]/authorization` (admin-only governance authorization intent creation)
- `GET /api/gnr8/admin/provider-handoffs/[handoffId]/execution-readiness-gate` (read-only execution readiness gate)
- `GET /api/gnr8/admin/provider-handoffs/[handoffId]/execution-preconditions` (read-only execution preconditions ledger)
- `GET /api/gnr8/admin/provider-handoffs/[handoffId]/execution-remediation-plan` (read-only execution blocker remediation planner)
- `GET /api/gnr8/admin/provider-handoffs/[handoffId]/dryrun-job-plan` (read-only dry-run planned jobs simulation evidence)
- `GET /api/gnr8/admin/provider-handoffs/[handoffId]/execution-job-preview` (read-only execution job shape preview evidence)
- `GET /api/gnr8/admin/provider-handoffs/[handoffId]/worker-envelope-preview` (read-only provider worker envelope preview evidence)
- `GET /api/gnr8/admin/provider-handoffs/[handoffId]/execution-safety-manifest` (read-only no-execution boundary proof evidence)
- `GET /api/gnr8/admin/providers/openprovider/domains` (read-only Openprovider domain inventory evidence)
- `GET /api/gnr8/admin/providers/openprovider/dns` (read-only Openprovider DNS records inventory evidence)
- `GET /api/gnr8/admin/providers/openprovider/domain-availability?domain=<domain>` (read-only Openprovider domain availability evidence)

Required production env flag:
- `GNR8_ADMIN_PROVIDER_HANDOFF_READINESS_SEED_ENABLED=1`

Evidence and diagnostics milestone:
- Provider Contract Registry Extraction is deployed:
  - canonical registry file:
    - `apps/platform/gnr8/runtime/providers/provider-contract-registry.ts`
  - canonical registry test:
    - `apps/platform/gnr8/runtime/providers/provider-contract-registry.test.ts`
  - current UI consumers:
    - `apps/platform/app/gnr8/admin/providers/page.tsx`
    - `apps/platform/app/gnr8/admin/providers/provider-fleet-view.tsx`
  - current providers in registry:
    - `Openprovider`
    - `Realtime Register`
    - `INWX`
    - `Netim`
  - canonical contract fields:
    - `providerId`
    - `displayName`
    - `providerType`
    - `providerCategory`
    - `environment`
    - `status`
    - `capabilities`
    - `readiness`
    - `boundaries`
    - `advisor`
    - `links`
  - Openprovider links:
    - `cockpit`
    - `domains`
    - `dns`
  - provider capabilities are category-aware:
    - registrar: `domains`, `dns`, `availability`, `registration`, `execution`
    - deployment: `deployments`, `previews`, `rollbacks`, `domains`, `environment_variables`
    - communication: `email_delivery`, `transactional_email`, `inbound_email`, `domains`, `webhooks`
    - erp/accounting: `accounting`, `invoicing`, `bookkeeping`, `tax`, `synchronization`
    - edge infrastructure: `dns`, `edge_compute`, `object_storage`, `cdn`, `routing`
    - commerce: `billing`, `subscriptions`, `invoices`, `webhooks`, `checkout`
    - execution: `jobs`, `workflows`, `retries`, `schedules`, `events`
    - source control: `repositories`, `branches`, `pull_requests`, `webhooks`, `commits`
    - AI: `model_metadata`, `routing_policy`, `inference`, `embeddings`, `multimodal`
    - storage: `database`, `object_storage`, `backups`, `vector_search`, `file_storage`
    - identity: `auth`, `users`, `sessions`, `oauth`, `sso`
  - summary behavior:
    - `Read-only Capabilities` remains `3` (Openprovider operational reads only)
  - boundary remains explicit:
    - deterministic read-model registry
    - no runtime provider execution
    - no provider APIs added
    - no writes
    - no queue/worker execution
  - conclusion:
    - Provider Fleet is no longer backed by inline UI objects. It now consumes a canonical provider contract registry, creating the foundation for multi-provider orchestration.
  - strategic direction:
    - evolve Provider Fleet into global GNR8 provider control plane covering registrar/domain, DNS, deployment, communication, ERP/accounting, edge infrastructure, commerce/billing, execution/job, source control, AI, storage/data, and identity providers
  - recommended next milestone:
    - Global Provider Taxonomy Expansion
  - success criteria:
    - future thread bootstrap resumes from registry-backed provider fleet, not hardcoded UI provider definitions
- Provider Fleet Cockpit is deployed:
  - UI route: `/gnr8/admin/providers`
  - milestone scope:
    - UI/read-model only
    - deterministic seeded provider registry
    - no runtime/provider execution changes
  - providers in registry:
    - `Openprovider`
    - `Realtime Register`
    - `INWX`
    - `Netim`
  - verified provider states:
    - Openprovider:
      - `status`: `connected`
      - `mode`: `sandbox`
      - capabilities:
        - `domains`: `true`
        - `dns`: `true`
        - `availability`: `true`
        - `registration`: `false`
        - `execution`: `false`
    - Realtime Register: `not_configured`
    - INWX: `not_configured`
    - Netim: `not_configured`
  - verified UI values:
    - `title`: `Provider Fleet Cockpit`
    - `subtitle`: `Global provider control plane`
    - `Providers`: `4`
    - `Connected`: `1`
    - `Read-only Capabilities`: `3`
    - `Execution`: `blocked`
  - boundary remains explicit:
    - read-only
    - no provider writes
    - no DNS writes
    - no registration
    - no queue/Inngest/worker execution
    - no provider execution
    - no secrets
    - no action buttons
  - conclusion:
    - GNR8 now has the first provider-level control tower above individual provider integrations.
    - this is the beginning of multi-provider orchestration/readiness visibility.
  - recommended next milestone:
    - Provider Capability Detail Cards / Provider Readiness Explainer
    - or Openprovider Availability UI Search Panel
  - success criteria:
    - future thread bootstrap resumes from global provider fleet cockpit milestone
- Provider Navigation Wiring is deployed:
  - completed navigation flow:
    - Agency Dashboard -> `/gnr8/admin/providers`
    - Provider Fleet Cockpit -> `/gnr8/admin/providers/openprovider`
    - Openprovider Provider Cockpit -> `/gnr8/admin/providers/openprovider/domains`
    - Openprovider Provider Cockpit -> `/gnr8/admin/providers/openprovider/dns`
  - changed UI files:
    - `app/gnr8/admin/agencies/[agencyId]/dashboard/page.tsx`
    - `app/gnr8/admin/providers/provider-fleet-view.tsx`
    - `app/gnr8/admin/providers/openprovider/openprovider-provider-cockpit-view.tsx`
  - verified UX:
    - Agency Dashboard includes Provider Fleet card
    - Openprovider is the only navigable provider row
    - Realtime Register, INWX, Netim remain non-linked / `not_configured`
    - Openprovider cockpit includes Provider Surfaces section
    - Provider Surfaces links to Domain Inventory and DNS Inventory
    - Availability remains embedded in Openprovider cockpit
  - boundary remains explicit:
    - UI/navigation only
    - no runtime changes
    - no API changes
    - no provider writes
    - no DNS writes
    - no registration
    - no queue/Inngest/worker execution
    - no provider execution
    - no secret changes
  - conclusion:
    - provider features are no longer hidden behind manually typed admin URLs
    - GNR8 now has a navigable provider control-plane flow from agency dashboard into provider fleet, provider cockpit, and read-only provider surfaces
  - recommended next milestone:
    - Provider Capability Detail Cards / Provider Readiness Explainer
    - or Openprovider Availability UI Search Panel
  - success criteria:
    - future thread bootstrap resumes from navigable Provider Control Plane UX
- Provider Capability Detail Cards / Readiness Explainer is deployed:
  - updated UI surfaces:
    - `/gnr8/admin/providers`
    - `/gnr8/admin/providers/openprovider`
  - capability explainer coverage:
    - `domains`
    - `dns`
    - `availability`
    - `registration`
    - `execution`
  - explainer semantics:
    - capability name
    - current status
    - explanation
    - readiness level
  - readiness states:
    - `sandbox_verified`
    - `not_enabled`
    - `control_plane_only`
  - verified Openprovider guidance:
    - `availability`: working / `sandbox_verified`
    - `registration`: disabled / `not_enabled`
    - `execution`: blocked / `control_plane_only`
  - boundary remains explicit:
    - read-only only
    - no provider writes
    - no DNS writes
    - no registration
    - no execution
    - no queue/Inngest/worker execution
    - no mutation POST controls
  - conclusion:
    - provider UX now includes capability explanations and readiness semantics in the provider control-plane flow
  - recommended next milestone:
    - Provider Readiness Advisor Layer
  - success criteria:
    - future thread bootstrap resumes from provider capability guidance milestone
- Provider Readiness Advisor Layer is deployed:
  - updated UI surfaces:
    - `/gnr8/admin/providers`
    - `/gnr8/admin/providers/openprovider`
  - new section:
    - `Readiness Advisor`
  - advisor cards:
    - `Current State`
    - `Current Limitations`
    - `Missing Requirements`
    - `Recommended Next Step`
  - provider fleet guidance:
    - one provider connected
    - multi-provider registry initialized
    - provider fleet navigation operational
    - only Openprovider connected
    - no production execution providers
    - no orchestration layer
    - missing provider abstraction layer
    - missing execution governance
    - missing multi-provider failover
    - missing production verification
    - recommended: connect second provider, normalize provider capabilities, introduce provider orchestration contracts
  - Openprovider guidance:
    - availability intelligence operational
    - DNS inventory operational
    - domain inventory operational
    - sandbox verified
    - read-only boundary active
    - registration disabled
    - execution blocked
    - no provider writes
    - no live environment verification
    - missing execution orchestration
    - missing approval workflows
    - missing worker/provider execution layer
    - missing live provider verification
    - missing mutation safety review
    - recommended: verify live environment behavior, prepare provider execution architecture, add approval-driven registration flow
  - preserved UI:
    - availability search panel preserved
    - provider surfaces links preserved
    - capability cards preserved
    - read-only messaging preserved
  - boundary remains explicit:
    - UI/read-model only
    - no runtime changes
    - no API changes
    - no provider writes
    - no DNS writes
    - no registration
    - no queue/Inngest/worker execution
    - no provider execution
  - conclusion:
    - provider UX now includes operator guidance/readiness interpretation, not only raw diagnostics and statuses
  - recommended next milestone:
    - Provider Orchestration Contract Draft
    - or Second Provider Placeholder Readiness Contract
  - success criteria:
    - future thread bootstrap resumes from Provider Readiness Advisor milestone
- Openprovider Availability Search Panel is deployed:
  - route:
    - `/gnr8/admin/providers/openprovider`
  - search behavior:
    - GET-only form
    - action: `/gnr8/admin/providers/openprovider`
    - query param: `?domain=<domain>`
    - default fallback: `levi-testis.com`
  - verified behavior:
    - real Openprovider availability lookups operational
    - sandbox provider responses visible through cockpit UI
    - no registration/write paths introduced
  - boundary remains explicit:
    - read-only only
    - no provider writes
    - no DNS writes
    - no registration
    - no execution
    - no queue/Inngest/worker execution
    - no mutation POST controls
  - conclusion:
    - provider UX now includes real provider availability intelligence search inside cockpit flow
  - recommended next milestone:
    - Provider Readiness Advisor Layer
  - success criteria:
    - future thread bootstrap resumes from provider capability guidance + availability search milestone
- Openprovider Domain Availability Read-only Connector is deployed:
  - runtime model: `gnr8/runtime/providers/openprovider/openprovider-domain-availability.ts`
  - shared auth helper: `gnr8/runtime/providers/openprovider/openprovider-auth.ts`
  - API: `GET /api/gnr8/admin/providers/openprovider/domain-availability?domain=<domain>`
  - env support:
    - `OPENPROVIDER_DOMAIN_AVAILABILITY_ENDPOINT`
    - `OPENPROVIDER_DOMAIN_AVAILABILITY_METHOD`
  - deployed verified values:
    - `provider`: `openprovider`
    - `readOnly`: `true`
    - `executionAllowed`: `false`
    - `executionBlocked`: `true`
    - `domain`: `levi-testis.com`
    - `available`: `true`
    - `status`: `available`
    - `endpoint path`: `/v1beta/domains/check`
  - diagnostics include:
    - `OPENPROVIDER_AUTH_STARTED`
    - `OPENPROVIDER_AUTH_SUCCEEDED`
    - `OPENPROVIDER_AVAILABILITY_BOUNDARY_CONFIRMED`
    - `OPENPROVIDER_AVAILABILITY_ENDPOINT_PATH:/v1beta/domains/check`
    - `OPENPROVIDER_AVAILABILITY_METHOD_POST`
    - `OPENPROVIDER_AVAILABILITY_REQUEST_SHAPED`
    - `OPENPROVIDER_AVAILABILITY_STARTED`
    - `OPENPROVIDER_AVAILABILITY_SUCCEEDED`
  - conclusion:
    - GNR8 can now perform real Openprovider read-only domain availability checks.
    - this is the first directly user-facing provider intelligence capability: `is this domain available?`
  - boundary remains explicit:
    - read-only
    - no registration
    - no DNS writes
    - no domain update/delete
    - no queue/Inngest/worker execution
    - no provider execution
    - no secret leakage
    - `executionAllowed:false`
    - `executionBlocked:true`
  - recommended next milestone:
    - Openprovider Domain Availability Admin UI
    - or Provider Reality Dashboard linking Domains + DNS + Availability
  - success criteria:
    - future thread bootstrap resumes from working real Openprovider availability lookup
- Openprovider DNS Inventory Admin UI is deployed:
  - UI route: `/gnr8/admin/providers/openprovider/dns`
  - backing API: `GET /api/gnr8/admin/providers/openprovider/dns`
  - deployed verified UI values:
    - `title`: `Openprovider DNS Inventory`
    - `banner`: `Read-only provider boundary active`
    - `provider`: `openprovider`
    - `mode`: `read only`
    - `execution`: `blocked`
    - `domains`: `0`
    - `records`: `0`
    - `inventory status`: `empty`
    - `empty message`: `No DNS records found in current Openprovider sandbox account.`
  - diagnostics include:
    - `OPENPROVIDER_AUTH_STARTED`
    - `OPENPROVIDER_AUTH_SUCCEEDED`
    - `OPENPROVIDER_DNS_READ_ONLY_BOUNDARY_CONFIRMED`
    - `OPENPROVIDER_DNS_READ_STARTED`
    - `OPENPROVIDER_DNS_READ_SUCCEEDED`
  - conclusion:
    - GNR8 now has a real provider-read UI surface for Openprovider DNS inventory.
    - the current sandbox account has no domains, so DNS inventory is empty, but auth, read boundary, API, and UI rendering are verified end-to-end.
  - boundary remains explicit:
    - read-only
    - no DNS writes
    - no domain registration/update/delete
    - no queue/Inngest/worker execution
    - no provider execution
    - no secret leakage
    - `executionAllowed:false`
    - `executionBlocked:true`
  - recommended next milestone:
    - Sandbox Domain Fixture / Seed Real Test Domain
    - or Provider Reality Dashboard linking Domain Inventory + DNS Inventory
  - success criteria:
    - future thread bootstrap resumes from real Openprovider DNS Inventory UI milestone
- Openprovider DNS Records Read-only Connector is deployed:
  - runtime model: `gnr8/runtime/providers/openprovider/openprovider-dns-record-inventory.ts`
  - shared auth helper: `gnr8/runtime/providers/openprovider/openprovider-auth.ts`
  - API: `GET /api/gnr8/admin/providers/openprovider/dns`
  - deployed verified values:
    - `provider`: `openprovider`
    - `readOnly`: `true`
    - `executionAllowed`: `false`
    - `executionBlocked`: `true`
    - `domains`: `[]`
  - diagnostics include:
    - `OPENPROVIDER_AUTH_STARTED`
    - `OPENPROVIDER_AUTH_SUCCEEDED`
    - `OPENPROVIDER_DNS_READ_ONLY_BOUNDARY_CONFIRMED`
    - `OPENPROVIDER_DNS_READ_STARTED`
    - `OPENPROVIDER_DNS_READ_SUCCEEDED`
  - conclusion:
    - GNR8 can now authenticate against Openprovider sandbox and perform read-only DNS inventory access.
    - current sandbox has no domains, so DNS inventory is empty but successful.
  - boundary remains explicit:
    - read-only
    - no DNS writes
    - no domain registration/update/delete
    - no queue/Inngest/worker execution
    - no provider execution
    - no secret leakage
    - `executionAllowed:false`
    - `executionBlocked:true`
  - recommended next milestone:
    - Openprovider Provider Reality UI: DNS Inventory Page
    - or Sandbox Domain Fixture / Seed Real Test Domain
  - success criteria:
    - future thread bootstrap resumes from real Openprovider DNS read-only milestone
- Operator Evidence Provenance Layer is deployed:
  - Executive Summary includes visible provenance support
  - Evidence Sources chips are present for provenance cues
  - static source mapping approach is used
  - no runtime lineage engine
  - no API changes
  - no runtime changes
  - no execution controls
  - verified source mappings:
    - Current Situation: `Readiness`, `Safety Manifest`
    - Primary Blockers: `Execution Preconditions Ledger`, `Execution Readiness Gate`, `Execution Remediation Plan`
    - Verified Positives: `Governance Decision Package`, `Execution Preconditions Ledger`, `Safety Manifest`
  - recommended next step:
    - `Execution Remediation Plan`
  - conclusion:
    - operator can now answer `How do we know this?` using visible evidence provenance
  - boundary remains:
    - execution impossible
    - simulation only
    - no provider execution
    - no queue execution
    - no secret resolution
  - recommended next milestone:
    - Operator Cockpit Completion / UI Freeze Candidate
  - success criteria:
    - future thread bootstrap resumes from provenance-enabled cockpit milestone
- Operator Cockpit Evidence Status Badges / Severity System is deployed:
  - badge severity levels: `critical`, `warning`, `success`, `info`, `neutral`
  - verified counters: `Critical: 8`, `Warnings: 4`, `Success: 8`
  - verified top cards: `Execution State`, `Governance State`, `Readiness State`, `Safety State`
  - verified sticky banner: `Execution impossible. Control-plane simulation only.`
  - verified grouping: `Governance`, `Execution Analysis`, `Execution Simulation`, `Safety`
  - UI/read-model only, no runtime changes, no API changes, no behavior changes
  - no execution controls added
  - milestone note: some badge chips currently render as a compact raw evidence strip below counters; acceptable for this milestone and may be refined later
  - execution boundary remains explicit:
    - no provider execution
    - no sandbox execution
    - no DNS writes
    - no Openprovider/registrar calls
    - no queue/Inngest/worker execution
    - no secret resolution
  - conclusion:
    - operator can now identify execution risk, readiness state, governance state, and safety state quickly through counters and visual badges
  - recommended next milestone:
    - Operator Cockpit Compact Evidence Strip / Visual Polish Pass
    - still no execution
- Evidence Surface Consolidation / Operator Cockpit Layout Pass is deployed:
  - readiness page reorganized from linear debug layout into operator-oriented cockpit layout
  - sticky summary banner: `Execution impossible. Control-plane simulation only.`
  - top summary cards: `Execution State`, `Governance State`, `Readiness State`, `Safety State`
  - grouped sections: `Governance`, `Execution Analysis`, `Execution Simulation`, `Safety`
  - default-collapsed sections: `Timelines`, `Diagnostics`, `Payload JSON Blocks`
  - UI/read-model only, no runtime model changes, no API changes, no behavior changes
  - all evidence artifacts preserved
  - no execution controls added
  - execution remains impossible
- seed creates/reuses deterministic persisted handoff
- readiness page shows persisted `handoffArtifact` and reconstructed deterministic `workerPickupEvidence`
- `workerPickupEvidence.blockedReasons` is normalized with no contradictory approval/handoff/planned-job reasons; reasons are deterministic and operator-readable
- operator review persistence exists via `gnr8_runtime_provider_operator_reviews`
- reviews API returns deterministic `reviewSummary` in `GET /api/gnr8/admin/provider-handoffs/[handoffId]/reviews`
- governance snapshot model exists: `runtime-provider-governance-snapshot.ts`
- governance snapshot combines: handoff readiness, `workerPickupEvidence`, operator `reviewSummary`, diagnostics
- governance snapshot fields: `snapshotId`, `handoffId`, `correlationKey`, `readinessStatus`, `executionBlocked: true`, `workerPickupEvidence`, `reviewSummary`, `diagnostics`, `createdAt`
- governance snapshot persistence table exists: `gnr8_runtime_provider_governance_snapshots`
- governance authorization model exists: `runtime-provider-governance-authorization.ts`
- governance authorization persistence table exists: `gnr8_runtime_provider_governance_authorizations`
- readiness API includes `governanceSnapshot`
- governance timeline API exists: `GET /api/gnr8/admin/provider-handoffs/[handoffId]/governance-timeline`
- readiness UI displays Governance Snapshot section
- readiness UI displays Governance Timeline section
- readiness UI displays Authorization section
- readiness UI displays Dry-run Job Plan section
- readiness UI displays Execution Job Preview section
- readiness UI displays Provider Worker Envelope Preview section
- readiness UI displays Provider Execution Safety Manifest section
- readiness UI displays Execution Readiness Gate section
- readiness UI displays Execution Preconditions Ledger section
- readiness UI displays Execution Remediation Plan section
- runtime dry-run job plan model exists: `runtime-provider-dryrun-job-plan.ts`
- runtime execution job preview model exists: `runtime-provider-execution-job-preview.ts`
- runtime provider worker envelope preview model exists: `runtime-provider-worker-envelope-preview.ts`
- runtime provider execution safety manifest model exists: `runtime-provider-execution-safety-manifest.ts`
- provider execution safety manifest verified deployed values:
  - `overallStatus`: `execution_impossible`
  - `summary`: `Provider execution is impossible in this runtime: active governance, worker, queue, provider, security, and execution boundaries enforce simulation-only behavior.`
  - diagnostics include:
    - `EXECUTION_SAFETY_BOUNDARY_PROVEN`
    - `EXECUTION_SAFETY_MANIFEST_CREATED`
- provider execution safety manifest verified barriers:
  - `governance_boundary_active`
  - `worker_dispatch_disabled`
  - `queue_allocation_disabled`
  - `provider_execution_disabled`
  - `secret_resolution_disabled`
  - `runtime_execution_boundary_active`
- provider execution safety manifest critical distinction:
  - safety manifest proves no-execution boundary
  - governance remains advisory
  - worker dispatch is disabled
  - queue allocation is disabled
  - provider execution is disabled
  - credential/secret resolution remains disabled
  - runtime remains simulation-only
  - `executionAllowed` remains `false`
  - `executionBlocked` remains `true`
- UI note:
  - secret-related barrier IDs may be redacted because generic redaction treats `secret` as sensitive
  - this is safe and non-blocking
- dry-run job plan verified deployed values:
  - `jobCount`: `1`
  - `summary`: `1 simulated provider jobs generated for readiness evidence.`
  - first job:
    - `jobType`: `provider_dns_upsert`
    - `provider`: `openprovider`
    - `environment`: `sandbox`
    - `status`: `simulated`
    - `reason`: `Deterministic simulation for operationKind=upsert_dns_record; execution remains disabled.`
- dry-run job plan is simulated evidence only:
  - no persisted execution jobs are created
  - `plannedJobIds` are not changed
  - no workers are enqueued
  - no provider calls are made
  - `executionAllowed` remains `false`
  - `executionBlocked` remains `true`
- execution job preview verified deployed values:
  - `jobCount`: `1`
  - `summary`: `1 execution job preview artifact(s) generated; execution remains disabled.`
  - first job:
    - `jobType`: `provider_dns_upsert`
    - `provider`: `openprovider`
    - `environment`: `sandbox`
    - `queueTarget`: `provider-control-plane`
    - `workerTarget`: `provider-execution-worker`
    - `simulatedStatus`: `preview_only`
    - `payloadShape` includes:
      - `providerId`: `openprovider`
      - `operationKind`: `upsert_dns_record`
      - `siteId`: `dev_readiness_seed_site`
      - `siteVersionId`: `00000000-0000-0000-0000-00000000d365`
      - `correlationKey`: `eed1514dcd76dcd5a14f7d07c59b982b550e18558090d5ee7eadb7e3ccecbd6a`
  - diagnostics include:
    - `EXECUTION_JOB_PREVIEW_INTENT_ONLY`
    - `EXECUTION_JOB_PREVIEW_JOB_CREATED`
- execution job preview is evidence only:
  - no persisted execution jobs are created
  - no `plannedJobIds` are changed
  - no queue records are allocated
  - no worker dispatch occurs
  - no provider calls occur
  - `executionAllowed` remains `false`
  - `executionBlocked` remains `true`
- provider worker envelope preview verified deployed values:
  - `summary`: `Deterministic provider worker envelope preview generated; execution remains disabled.`
  - `queueTarget`: `provider-control-plane`
  - `workerTarget`: `provider-execution-worker`
  - `payloadVersion`: `v1`
  - `executionIntent`: `control_plane_simulation_only`
  - `executionBlocked`: `true`
  - `executionAllowed`: `false`
  - `providerId`: `openprovider`
  - `operationKind`: `upsert_dns_record`
  - `environment`: `sandbox`
  - `siteId`: `dev_readiness_seed_site`
  - `siteVersionId`: `00000000-0000-0000-0000-00000000d365`
  - diagnostics include:
    - `PROVIDER_WORKER_ENVELOPE_PREVIEW_INTENT_ONLY`
- provider worker envelope preview is evidence only:
  - worker envelope is preview/evidence only
  - no queue records are allocated
  - no worker dispatch occurs
  - no provider execution occurs
  - no payload is sent to a runtime worker
  - `executionAllowed` remains `false`
  - `executionBlocked` remains `true`
- governance authorization statuses:
  - `not_requested`
  - `pending_authorization`
  - `authorized_for_future_execution`
  - `denied`
- readiness UI keeps detailed operator review list visible
- readiness UI includes create operator review form with:
  - status dropdown values: `pending_review`, `approved_for_future_execution`, `rejected`, `needs_changes`
  - reason textarea
  - Save review intent action
- diagnostics include:
  - `GOVERNANCE_SNAPSHOT_CREATED`
  - `GOVERNANCE_SNAPSHOT_REUSED`
  - `GOVERNANCE_SNAPSHOT_AUDIT_READ`
  - `GOVERNANCE_SNAPSHOT_PERSIST_FAILED_CLOSED`
- `approved_for_future_execution` is intent-only; it does not authorize execution
- `authorized_for_future_execution` is intent-only; it does not authorize execution
- `executionBlocked` remains `true`
- governance snapshot is evidence only
- execution readiness gate verified values:
  - `gateStatus`: `blocked`
  - `executionAllowed`: `false`
  - `executionBlocked`: `true`
  - `blockingReasons`:
    - `approval_status_blocked`
    - `global_execution_boundary_active`
    - `handoff_status_blocked`
    - `no_planned_jobs`
- execution preconditions ledger verified values:
  - `overallStatus`: `blocked`
  - `executionAllowed`: `false`
  - `executionBlocked`: `true`
  - `missingRequirements`:
    - `execution_planned_jobs_present:missing`
  - `blockedRequirements`:
    - `approval_status_not_blocked:blocked`
    - `execution_handoff_status_not_blocked:blocked`
- execution remediation plan verified values:
  - `overallStatus`: `blocked`
  - `summary`: `Execution remains blocked because 4 remediation actions are still unresolved.`
  - `diagnostics`:
    - `EXECUTION_REMEDIATION_ACTIONS_GENERATED`
    - `EXECUTION_REMEDIATION_INTENT_ONLY`
    - `EXECUTION_REMEDIATION_PLAN_CREATED`
  - `remediationActions`:
    1. `critical` / `ledger`
       - `reason`: `Approval status is blocked.`
       - `recommendedAction`: `Review approval workflow before execution eligibility can be evaluated.`
    2. `high` / `ledger`
       - `reason`: `No planned jobs are present.`
       - `recommendedAction`: `Create deterministic planned jobs before execution readiness evaluation.`
    3. `critical` / `handoff`
       - `reason`: `Handoff status is blocked.`
       - `recommendedAction`: `Resolve handoff blockers and regenerate readiness evidence.`
    4. `normal` / `gate`
       - `reason`: `Global execution boundary is active.`
       - `recommendedAction`: `Execution boundary intentionally active. No action required.`
- governance conditions satisfied/passed while execution remained blocked:
  - `review_approved_for_future_execution`: satisfied/passed
  - `authorization_authorized_for_future_execution`: satisfied/passed
- conclusion:
  - governance intent can be satisfied while execution readiness remains blocked
  - GNR8 can now explain not only why execution is blocked, but what remediation steps remain before future execution could ever become possible.

Deployed manual verification loop (completed):
- readiness-test UI creates/reuses deterministic handoff
- readiness inspection loads `handoffArtifact`
- `workerPickupEvidence` is displayed
- operator review form creates persisted review intent
- authorization form creates persisted authorization intent
- governance snapshot updated after authorization/review state changed
- governance timeline contains multiple snapshots
- operator review summary displays persisted review state
- Governance Snapshot is displayed
- Governance Timeline is displayed
- Governance Decision Package is displayed
- Governance Timeline verified fields:
  - `snapshotId`
  - `createdAt`
  - `reviewSummaryStatus`
  - `reviewCount`
  - `readinessStatus`
  - `diagnostics`
- `executionBlocked` remains `true`

Governance Decision Package milestone verification:
- verified deployed flow:
  - readiness
  - operator review summary
  - governance authorization
  - governance snapshot
  - governance timeline
  - governance decision package
- verified values:
  - `recommendedAction`: `remain_blocked`
  - `executionBlocked`: `true`
  - `reviewStatus`: `approved_for_future_execution`
  - `authorizationStatus`: `authorized_for_future_execution`
  - `snapshotCount`: `3`
- boundary reminder:
  - decision package remains advisory only
  - execution remains blocked

Example verified values:
- `authorizationStatus`: `authorized_for_future_execution`
- `authorizationReason`: `1234`
- `intentOnly`: `true`
- `executionBlocked`: `true`
- diagnostics include:
  - `GOVERNANCE_AUTHORIZATION_CREATED`
  - `GOVERNANCE_AUTHORIZATION_INTENT_ONLY`

Future note:
- deterministic `createdAt` may show epoch values for dev-seed artifacts
- potential future improvement: add `snapshotCreatedAt` and `persistedAt`
- recommended next milestone: Operator Cockpit Compact Evidence Strip / Visual Polish Pass (still no execution)

Hard boundaries remain:
- no live provider execution
- no sandbox execution
- no worker execution for provider actions
- no Openprovider API calls
- no DNS writes
- no queue/Inngest execution for provider handoff readiness inspection
- no queue/Inngest/worker execution
- no external registrar calls
- no secret reads/stores
- no secret resolution
- no persisted execution job creation from dry-run job plan
- no `plannedJobIds` mutation from dry-run job plan
- no persisted execution job creation from execution job preview
- no `plannedJobIds` mutation from execution job preview
- no queue record allocation from execution job preview
- no worker dispatch from execution job preview
- no queue record allocation from worker envelope preview
- no worker dispatch from worker envelope preview
- no provider execution from worker envelope preview
- no runtime worker payload send from worker envelope preview
- Openprovider sandbox planning/dry-run artifacts only. No provider execution is permitted, including sandbox execution. Control-plane metadata and deterministic planning only.

## F) Current Active Implementation Phase

Active phase: Openprovider Domain Availability Read-only Connector milestone (deployed and verified).

Practical next phase:
1. Openprovider Domain Availability Admin UI.
2. Provider Reality Dashboard linking Domains + DNS + Availability.

## G) How Next Thread Should Behave

1. Read canonical files first before proposing changes.
2. Compare docs against actual repository structure before edits.
3. Update canonical docs instead of creating parallel systems.
4. Preserve deterministic contracts and explicit diagnostics.
5. Treat live/provider execution as disallowed unless explicitly re-authorized.

## Documentation Discipline

Rules:
- Update canonical docs instead of creating parallel doctrine.
- Do not create "final/v2/new/current" duplicates.
- If a document is historical, mark or index it as secondary/archive.
- Baseline/checkpoint docs are evidence, not the primary doctrine.
- When current state changes, update `docs/ai/GNR8_CURRENT_STATE.md` and relevant baseline/checkpoint docs.

## Ready-to-Copy Prompt

"Read these files first in this exact order: docs/ai/GNR8_THREAD_HANDOFF.md, docs/ai/GNR8_MASTER_CONTEXT_BOOTSTRAP.md, docs/ai/GNR8_CURRENT_STATE.md, docs/ai/GNR8_TASK_EXECUTION_PROTOCOL.md, docs/ai/GNR8_COLLABORATION_PROTOCOL.md, docs/ai/GNR8_PROJECT_MAP.md, docs/ai/GNR8_CANONICAL_DOC_INDEX.md, and docs/ai/decisions/*.md. Read docs/ai/GNR8_COLLABORATION_PROTOCOL.md before generating Codex tasks. Then compare with apps/platform/gnr8/**, apps/worker/gnr8/**, and apps/platform/supabase/migrations/** before making any changes. Keep deterministic contracts, control-plane boundaries, and no-live-execution rules intact."
