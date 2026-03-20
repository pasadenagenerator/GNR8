1. Purpose

Ta dokument definira:

kako spletne strani v GNR8 živijo, se spreminjajo, publishajo in rollbackajo.

To je operacijski backbone platforme.

Če je to pravilno →
AI, migration, renderer, agency ops vse postane stabilno.

Če je to napačno →
platforma postane kaos.

⸻

2. Core Principle

GNR8 nikoli ne dela nad “live site”.

Vedno dela nad:

👉 Site Versions

Live site je samo:

pointer na verzijo.

⸻

3. Canonical Entities

3.1 Site

Predstavlja:
	•	brand / client website
	•	identity container
	•	domain ownership

Site vsebuje:
	•	metadata
	•	ownership (org)
	•	config
	•	active version pointer

⸻

3.2 SiteVersion

To je:

👉 immutable snapshot celotne spletne strani

Vsebuje:
	•	page tree
	•	content
	•	design tokens
	•	asset graph
	•	runtime directives
	•	AI annotations
	•	migration provenance

Ko je enkrat ustvarjena:

❗ se ne sme več spreminjati

⸻

3.3 PageVersion

Sub-unit SiteVersion.

To omogoča:
	•	partial rebuild
	•	diffing
	•	validation granularity
	•	incremental publish

⸻

4. Version States

SiteVersion ima lifecycle state:

DRAFT
READY_FOR_REVIEW
APPROVED
PUBLISHED
ARCHIVED
ROLLED_BACK_REFERENCE


⸻

5. Draft Model

Draft je:
	•	editable workspace
	•	AI transform playground
	•	migration staging area

Draft lahko nastane iz:
	•	migration import
	•	clone existing version
	•	AI generation
	•	manual edits

⸻

6. Approval Model

Approval je:

👉 precondition za publish

Approval je:
	•	human operator decision
	•	lahko assisted by AI
	•	lahko multi-step v prihodnosti

V1:
	•	single approval gate

⸻

7. Publish Model

Publish pomeni:

Create new SiteVersion
 → mark as Published
 → move active pointer
 → emit deploy artifact
 → invalidate cache

Live site se ne “update-a”.

Live site se:

👉 preusmeri na novo verzijo.

⸻

8. Immutable Version Guarantee

Ko verzija postane Published:
	•	content se ne spreminja
	•	layout se ne spreminja
	•	assets se ne spreminjajo
	•	design tokens se ne spreminjajo

Če želiš spremembo:

👉 ustvariš novo verzijo.

⸻

9. Rollback Model

Rollback ni:
	•	undo
	•	patch

Rollback je:

Move active pointer → older SiteVersion

To omogoča:
	•	instant restore
	•	deterministic recovery
	•	safe AI experimentation

⸻

10. Migration Integration

Migration pipeline ne sme:
	•	directly publish
	•	overwrite live

Migration pipeline:

Import
 → create Draft Version
 → validation
 → operator review
 → approval
 → publish


⸻

11. AI Integration

AI nikoli ne dela nad:
	•	live site

AI dela nad:

👉 Draft Version

AI lahko:
	•	predlaga novo verzijo
	•	generira novo verzijo
	•	transformira draft
	•	pripravi publish kandidat

AI ne sme:
	•	direktno publishati (V1 rule)

⸻

12. Autopilot Future Model

Kasneje:

AI lahko publish-a:

če:
	•	risk score low
	•	policy allow
	•	org setting allow

To je:

👉 future autonomy model

Ne V1.

⸻

13. Multi-Page Coordination

SiteVersion mora zagotavljati:
	•	consistent navigation tree
	•	shared design system
	•	global style tokens
	•	asset deduplication

To pomeni:

👉 publish je site-wide atomic

Ne page-level publish.

⸻

14. Incremental Rendering Strategy

Čeprav publish je site-wide:

Renderer lahko:
	•	cache page-level
	•	rebuild partial artifacts
	•	reuse assets

Ampak version identity je:

👉 site scope

⸻

15. Diff Model

Med verzijami mora obstajati:
	•	structural diff
	•	content diff
	•	style diff
	•	asset diff
	•	AI intent diff

To omogoča:
	•	operator trust
	•	explainability
	•	agency review workflows

⸻

16. Version Metadata

Vsaka verzija mora imeti:
	•	created_by (user / AI / migration)
	•	creation_reason
	•	source_version
	•	validation_score
	•	AI_confidence
	•	migration_source_url
	•	publish_time
	•	rollback_history

⸻

17. Publish Safety Rules

Publish ne sme biti allowed če:
	•	validation critical fail
	•	missing required assets
	•	structural corruption
	•	required approvals missing

Publish mora biti:

👉 safe by construction

⸻

18. Preview Model

Preview ni:
	•	fake rendering

Preview je:

👉 real rendering of specific version

To pomeni:

Preview URL vsebuje:
	•	SiteVersion ID
	•	optional PageVersion ID

⸻

19. Multi-Environment Model

Future environments:
	•	preview
	•	staging
	•	production

V1 lahko ima:

👉 preview + production only

⸻

20. Domain Binding

Domain ne kaže na:
	•	site
	•	org
	•	project

Domain kaže na:

👉 active SiteVersion

To omogoča:
	•	atomic swap
	•	instant rollback
	•	multi-region deploy flexibility

⸻

21. Storage Strategy

SiteVersion mora biti:
	•	durable
	•	reproducible
	•	portable

To pomeni:
	•	artifact bundle
	•	structured DB model
	•	asset registry snapshot

⸻

22. Analytics & Learning

Vsaka verzija je:

👉 learning unit za AI

AI lahko analizira:
	•	performance metrics
	•	conversion signals
	•	engagement
	•	SEO outcomes

In generira:
	•	next version proposals

⸻

23. Agency Workflow Integration

Agency mora imeti:
	•	version timeline
	•	approval log
	•	rollback control
	•	publish audit trail
	•	client review link

To je:

👉 core agency value prop

⸻

24. Version Explosion Control

System mora preprečiti:
	•	infinite drafts
	•	AI spam versions
	•	migration junk

Policy:
	•	soft limits
	•	archive strategies
	•	version scoring
	•	garbage collection later

⸻

25. Founder Directive

Versioning system mora biti:
	•	safer than WordPress
	•	clearer than Webflow
	•	more deterministic than headless CMS
	•	AI-native by design

To je:

🔥 operational moat GNR8