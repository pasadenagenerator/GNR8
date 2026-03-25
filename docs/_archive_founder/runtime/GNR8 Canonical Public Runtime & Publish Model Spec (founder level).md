GNR8 Canonical Public Runtime & Publish Model Spec (founder level)

1. Purpose

Ta spec definira:

Kako so GNR8 spletne strani shranjene, zgrajene, deployane, servirane in verzionirane v produkciji.

To NI:
	•	migration pipeline spec
	•	AI spec
	•	editor spec

To je:

👉 production runtime contract

⸻

2. Fundamental Principle

GNR8 NI builder runtime.

GNR8 je:

Structured site platform with deterministic rendering.

To pomeni:
	•	AI + migration ustvarita Site Model
	•	Public runtime rendera iz Site Model
	•	HTML NI source of truth

Source of truth je:

👉 Canonical Site Graph

⸻

3. Canonical Site State

Authoritative state:

Org
 → Project (Site)
   → Site Graph
   → Versions
   → Deployment history

Site Graph vsebuje:
	•	pages
	•	layout tree
	•	components
	•	content
	•	design tokens
	•	assets
	•	semantic metadata

To je:

👉 ena resnica

Ne:
	•	builder JSON
	•	static HTML snapshot
	•	CMS blobs

⸻

4. Rendering Model

4.1 Runtime Rendering Strategy

V1 runtime je:

Deterministic server + edge render from structured model.

Ne:
	•	pure static export platform
	•	pure client builder runtime
	•	hybrid chaos

Render pipeline:

Request
 → Resolve org/site/version
 → Load Site Graph
 → Deterministic renderer
 → HTML + CSS + assets
 → Edge cache


⸻

4.2 Static Optimization

System MAY:
	•	pre-render pages
	•	cache aggressively
	•	snapshot versions

But:

Static HTML is:

👉 optimization artifact
not canonical truth

⸻

5. Deployment Model

5.1 Deployment Unit

Deployment unit je:

→ Site Version

Site version vsebuje:
	•	frozen site graph
	•	asset manifest
	•	design tokens
	•	semantic snapshot

Deployment ni:
	•	git push
	•	build pipeline
	•	builder publish

Deployment je:

👉 version activation

⸻

5.2 Deployment Flow

AI / Operator changes
 → new Site Version created
 → validation
 → approval
 → activate version
 → edge propagation


⸻

6. Multi-Tenant Runtime Isolation

Isolation model:

Runtime Layer
 → Org boundary
 → Site boundary
 → Version boundary

Each request resolves:
	•	orgId
	•	siteId
	•	versionId

This allows:
	•	instant rollback
	•	A/B infra later
	•	agency isolation
	•	per-client hosting logic

⸻

7. Domain Model

Domain mapping:

Custom domain
 → siteId
 → activeVersionId

System must support:
	•	instant domain switching
	•	preview domains
	•	migration staging domains

⸻

8. Preview vs Production Runtime

Preview runtime:
	•	version-scoped
	•	no SEO indexing
	•	optional auth
	•	no analytics mutation

Production runtime:
	•	stable version pointer
	•	full caching
	•	performance optimized

⸻

9. Asset Strategy

Assets are:
	•	imported
	•	normalized
	•	fingerprinted
	•	stored in canonical asset layer

Never:
	•	hotlink long-term
	•	depend on source site

Asset resolution:

Asset reference
 → assetId
 → storage location
 → CDN URL


⸻

10. CSS / Design System Runtime

CSS is generated from:
	•	design tokens
	•	layout tree
	•	component styling rules

Not:
	•	raw imported CSS

Imported CSS:

→ transitional artifact

AI must gradually:

→ eliminate legacy CSS dependence

⸻

11. Versioning Guarantees

Each site version must guarantee:
	•	deterministic rendering
	•	reversible activation
	•	semantic integrity
	•	asset completeness

Rollback must be:

→ instant pointer switch

⸻

12. Publish Safety Model

Before activation:

System validates:
	•	render integrity
	•	asset completeness
	•	layout validity
	•	semantic consistency

AI changes cannot:

→ auto-publish high-risk changes

⸻

13. Runtime Performance Model

Performance priority:
	1.	Edge caching
	2.	pre-render snapshots
	3.	minimal runtime computation
	4.	deterministic output
	5.	no heavy client builder JS

Goal:

👉 faster than Webflow output

⸻

14. Observability

Runtime must track:
	•	render errors
	•	asset misses
	•	performance metrics
	•	version activation logs
	•	AI change attribution

This enables:

→ trust in autopilot

⸻

15. Migration Integration

Migration produces:

→ initial Site Graph version

Not:

→ final public HTML

Migration output always goes through:

→ canonical runtime

⸻

16. Future Evolution Hooks

Runtime must allow:
	•	AI live optimization
	•	personalization
	•	adaptive layouts
	•	dynamic content injection
	•	experimentation engine

But:

V1 keeps runtime deterministic.

⸻

17. Founder Directive

Public runtime must be:
	•	simpler than builders
	•	safer than custom dev
	•	faster than static export tools
	•	scalable to thousands of sites

If runtime is wrong:

👉 whole GNR8 collapses.

If runtime is right:

👉 everything else becomes easier.