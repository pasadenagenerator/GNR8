# Workspace Wireframes v1

## Status
- Draft: first structural wireframe specification
- Scope: documentation only
- Non-goals: no runtime changes, no UI implementation, no APIs, no database changes

## Purpose
Define the first complete screen-level structure and information hierarchy for the GNR8 Workspace before visual design and implementation.

This document is a wireframe specification, not a visual design system and not executable UI.

## Workspace-Level Structural Rules
- Global frame is consistent across all workspace screens:
  - Left: workspace navigation rail
  - Center: primary work surface
  - Right: contextual intelligence and governance panel
- Governance boundary remains explicit:
  - direct publish is not available from editing surfaces
  - significant mutations enter proposal + approval flow
- AI boundary remains explicit:
  - AI acts as a governed assistant/editor surface
  - AI outputs become suggestions or proposals

## Canonical Screen Set
1. Website Overview
2. Content Workspace
3. Design Workspace
4. Experience Workspace
5. Governance Workspace
6. AI Workspace
7. Operations Workspace

---

## 1) Website Overview

### Purpose
Act as the workspace homepage and digital twin summary of a website's current state.

### Primary Objects
- Website Identity Card
- Website Health Summary
- Domain Score Summary (Content, Design, Experience, Governance, Operations)
- Signal Summary (Quality, Freshness, Consistency, Accessibility, Performance, Conversion Friction, Governance Risk, Provider Readiness)
- Status & Environment Summary
- Recent Activity Feed
- Pending Proposals Queue
- Pending Approvals Queue
- Latest Publish Record
- Optimization Opportunities
- AI Recommendations Summary
- Provider Status Summary

### Information Hierarchy
1. Website identity and critical status
2. Immediate decisions required (proposals/approvals)
3. Most recent operational changes (publish/activity)
4. Optimization and AI guidance
5. Provider/environment context

### Left Navigation
- Overview (active)
- Content
- Design
- Experience
- Governance
- AI
- Operations

### Center Area
- Top: Website identity + environment badge + health snapshot
- Top/Mid: domain score strip and signal health indicators
- Mid: two priority queues (pending proposals, pending approvals)
- Mid/Lower: recent activity timeline + latest publish card
- Bottom: optimization opportunities + AI recommendations summary panels

### Right Context Panel
- Active environment status
- Provider connectivity status
- Risk/attention alerts
- Quick governance reminders (approval required, publish boundary)
- Recommendation progression state (observation -> recommendation -> optimization opportunity -> proposal candidate)

### Actions
- View proposal queue
- View approvals queue
- Open latest publish details
- Open optimization item details
- Open AI recommendations

### AI Surfaces
- AI Recommendations Summary
- Opportunity prioritization hints
- Suggested next review actions (proposal-first, approval-aware)
- AI may generate recommendations but may not publish directly

---

## 2) Content Workspace

### Purpose
Provide structured content operations across pages, collections, products, media, and SEO under governance.

### Primary Objects
- Content Collections List
- Page/Entry Listing
- Content Detail Pane (selected item)
- Status Metadata (draft/proposed/approved/published)
- Change History Snapshot
- Related Assets/References

### Information Hierarchy
1. Content domain selector and collection scope
2. Content item list with status and priority
3. Selected content details and fields
4. Related references and history
5. AI content suggestions

### Left Navigation
- Overview
- Content (active)
- Design
- Experience
- Governance
- AI
- Operations

### Center Area
- Top: Content domain tabs (pages, collections, products, media, SEO)
- Left-center within workspace: filterable/sortable content list
- Main center: selected content structure/details and field groups
- Lower center: change timeline for selected content object

### Right Context Panel
- Object metadata (owner scope, environment scope, version state)
- Validation and governance notes
- Linked design/experience dependencies
- Suggested next governance-safe action

### Actions
- Create proposal from content change intent
- Compare selected item with prior version
- Open related proposals
- Link/unlink related content references

### AI Surfaces
- Content rewrite/refinement suggestions
- SEO improvement suggestions
- Structured proposal draft generation from content intent

---

## 3) Design Workspace

### Purpose
Manage reusable design system structures (themes, tokens, components, templates, layouts) as governed assets.

### Primary Objects
- Theme Registry
- Token Sets
- Component Catalog
- Template Library
- Layout Definitions
- Design Dependency Map

### Information Hierarchy
1. Design domain scope (theme/token/component/template/layout)
2. Reusable asset catalog with status
3. Selected design object detail/configuration
4. Dependency and impact context
5. AI-assisted design proposal hints

### Left Navigation
- Overview
- Content
- Design (active)
- Experience
- Governance
- AI
- Operations

### Center Area
- Top: design domain switcher
- Left-center within workspace: searchable design asset catalog
- Main center: selected design object detail with structured properties
- Lower center: dependency/impact preview list

### Right Context Panel
- Reuse footprint summary
- Impact risk indicator
- Governance status and linked proposals
- Related experience surfaces affected

### Actions
- Create design mutation proposal
- Compare token/component version differences
- Open impacted experience flows
- Open governance history for selected design asset

### AI Surfaces
- Design consistency suggestions
- Token normalization suggestions
- Draft proposal generation for reusable pattern updates

---

## 4) Experience Workspace

### Purpose
Model and manage user journeys, funnels, navigation, and personalization behavior as governed experience assets.

### Primary Objects
- Journey Registry
- Funnel Definitions
- Navigation Structures
- Personalization Rules
- Experience Metrics Snapshot
- Experience Change Proposals

### Information Hierarchy
1. Experience type selector (journey/funnel/navigation/personalization)
2. Selected flow/structure and state
3. Flow-level metrics/observations
4. Dependencies (content + design)
5. AI optimization suggestions

### Left Navigation
- Overview
- Content
- Design
- Experience (active)
- Governance
- AI
- Operations

### Center Area
- Top: experience domain selector
- Main center: selected journey/funnel/navigation structure with step hierarchy
- Lower center: observations/metrics summary and recent changes
- Auxiliary center section: linked content/design dependencies

### Right Context Panel
- Conversion or completion risk notes
- Personalization governance constraints
- Related proposals/approvals
- Recommendation confidence indicators

### Actions
- Create experience optimization proposal
- Inspect dependent content/design nodes
- Open recent experiment or observation records
- Open approval history for selected experience object

### AI Surfaces
- Journey bottleneck suggestions
- Funnel optimization suggestions
- Personalization rule improvement recommendations

---

## 5) Governance Workspace

### Purpose
Provide the single governed control surface for proposals, approvals, versions, publishing, rollback, and audit trail.

### Primary Objects
- Proposal Queue
- Approval Queue
- Version Registry
- Publish Plan / Publish Records
- Rollback Candidates
- Audit Trail Timeline

### Information Hierarchy
1. Pending governance decisions
2. Version/publish readiness
3. Rollback readiness and risk
4. Full audit visibility
5. AI-assisted governance analysis

### Left Navigation
- Overview
- Content
- Design
- Experience
- Governance (active)
- AI
- Operations

### Center Area
- Top: governance tabs (proposals, approvals, versions, publish, rollback, audit)
- Main center: selected governance list/table with deterministic status fields
- Lower center: decision detail and evidence references

### Right Context Panel
- Decision policy reminders
- Risk severity and blocker list
- Environment/publish boundary notes
- Required approver or role context

### Actions
- Approve/reject proposal (role and policy permitting)
- Open version diff
- Prepare publish plan review
- Open rollback package details
- Filter audit trail by actor/object/time

### AI Surfaces
- Governance risk summarization
- Proposal quality/completeness hints
- Conflict detection hints between concurrent proposals

---

## 6) AI Workspace

### Purpose
Offer a dedicated governed AI working environment for suggestion generation, proposal drafting, and recommendation review.

### Primary Objects
- AI Task Intents
- Suggestion Queue
- Proposal Draft Queue
- Recommendation History
- AI Activity Log
- Governance Boundary Notices

### Information Hierarchy
1. AI task intent selection
2. Current suggestion/proposal outputs
3. Human review and acceptance decisions
4. Historical recommendation traceability
5. AI usage governance context

### Left Navigation
- Overview
- Content
- Design
- Experience
- Governance
- AI (active)
- Operations

### Center Area
- Top: AI intent/task type selector
- Main center: generated suggestions/proposal drafts with comparison context
- Lower center: review outcomes and accepted/rejected history

### Right Context Panel
- Model/routing metadata (preview or configured)
- Confidence/uncertainty indicators
- Governance constraints and non-publish boundary
- Related workspace object links

### Actions
- Send AI output to proposal workflow
- Accept/reject/edit suggestion
- View recommendation history
- Open linked content/design/experience context

### AI Surfaces
- Primary AI generation surface
- Recommendation memory/history
- Structured proposal authoring assistant

---

## 7) Operations Workspace

### Purpose
Expose environment and provider operations status as governance-aware operational visibility surfaces.

### Primary Objects
- Environment Status Matrix
- Provider Fleet Summary
- Credential Boundary Summary
- Deployment Timeline
- Execution Governance Chain
- Operational Alerts/Incidents

### Information Hierarchy
1. Environment and provider operational status
2. Credential/execution governance boundaries
3. Deployment state and recent operations
4. Active blockers and remediation guidance
5. AI-assisted operations advisories

### Left Navigation
- Overview
- Content
- Design
- Experience
- Governance
- AI
- Operations (active)

### Center Area
- Top: environment scope selector + global operational snapshot
- Main center: provider and deployment status tables/cards
- Lower center: execution governance chain and blocker/remediation panels

### Right Context Panel
- Credential boundary advisories
- Execution readiness flags
- Environment-specific risk notes
- Suggested next operational governance step

### Actions
- Open provider details
- Open deployment/publish correlation records
- Inspect execution blocker evidence
- Open remediation guidance

### AI Surfaces
- Operational anomaly suggestions
- Readiness gap recommendations
- Priority ordering hints for remediation actions

---

## Cross-Screen Consistency Rules
- Left navigation order is canonical and unchanged across screens.
- Center area always hosts the primary object workflow for the active screen.
- Right context panel always hosts risk, governance, and contextual decision support.
- AI surfaces are embedded on every screen as governed assistive layers.
- Proposal-first and approval-aware boundaries remain visible in every screen.

## Current State
Wireframe specification only.

Explicitly:
- no visual design system
- no runtime changes
- no UI implementation
- no APIs
- no database changes

## Success Condition
GNR8 has the first complete structural workspace screen blueprint before visual design begins.

## Related Documents
- `docs/architecture/WEBSITE_INTELLIGENCE_ARCHITECTURE.md`
- `docs/architecture/WORKSPACE_UI_CONCEPT_ARCHITECTURE.md`
- `docs/architecture/WORKSPACE_INFORMATION_ARCHITECTURE.md`
- `docs/architecture/EXPERIENCE_WORKSPACE_ARCHITECTURE.md`
- `docs/architecture/WEBSITE_EVOLUTION_LIFECYCLE_ARCHITECTURE.md`
- `docs/ai/GNR8_CURRENT_STATE.md`
- `docs/ai/GNR8_THREAD_HANDOFF.md`
