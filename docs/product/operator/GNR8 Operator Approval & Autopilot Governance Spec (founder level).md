1. Purpose

Ta spec definira:

Kako AI, operatorji in agencije sodelujejo pri spremembah na spletnih straneh.

To je:
	•	safety model
	•	trust model
	•	autonomy model

To NI:
	•	AI capability spec
	•	migration spec
	•	runtime spec

To je:

👉 decision authority architecture

⸻

2. Core Principle

AI nikoli nima absolutne oblasti.

GNR8 model:

AI proposes → System evaluates → Operator decides → System executes

Kasneje:

AI executes within granted autonomy scope.

⸻

3. Actors in Governance Model

3.1 Actor Types

Platform
 → Agency Org
   → Agency Operator
   → Client Operator
   → AI Agent

Vsak actor ima:
	•	permission scope
	•	risk ceiling
	•	execution rights

⸻

3.2 AI is a First-Class Actor

AI ni feature.

AI je:

👉 operational entity

AI ima:
	•	identity
	•	scope
	•	action history
	•	audit trail

⸻

4. Change Classification Model

Vsaka sprememba mora biti klasificirana.

4.1 Risk Classes

LOW RISK
	•	copy tweaks
	•	spacing/layout minor
	•	image replacement
	•	metadata changes
	•	performance tuning
	•	SEO improvements

MEDIUM RISK
	•	section redesign
	•	navigation changes
	•	component changes
	•	design token change
	•	new page creation
	•	pricing content update

HIGH RISK
	•	publish activation
	•	domain changes
	•	destructive content removal
	•	structural layout refactor
	•	legal page change
	•	billing-affecting change
	•	analytics injection
	•	script injection

CRITICAL RISK
	•	delete site
	•	delete org data
	•	billing operations
	•	permission changes
	•	security changes

⸻

5. Approval Policy Matrix

5.1 Default V1 Policy

Risk	AI Autopilot	Operator Approval	Platform Lock
LOW	Allowed	Optional	No
MEDIUM	Suggest only	Required	No
HIGH	Suggest only	Required (Senior)	Possible
CRITICAL	Forbidden	Platform only	Yes


⸻

5.2 Agency Overrides

Agency lahko definira:
	•	stricter policy
	•	per-client policy
	•	per-site policy

Primer:

Luxury brand:

→ autopilot only LOW

Growth startup:

→ autopilot LOW + some MEDIUM

⸻

6. Autopilot Scope Model

Autopilot ni binary.

Autopilot je:

AI Capability Scope
 → Content Autopilot
 → Design Autopilot
 → SEO Autopilot
 → Performance Autopilot
 → Marketing Autopilot

Each scope ima:
	•	allowed actions
	•	risk ceiling
	•	execution frequency

⸻

7. Approval Workflow

7.1 Change Lifecycle

AI detects opportunity
 → AI proposes change
 → System risk-classifies
 → Approval requested
 → Operator reviews
 → Version created
 → Activation decision


⸻

7.2 Batch Approval

Operator lahko:
	•	approve multiple changes
	•	schedule activation
	•	create approval rules

⸻

8. Explainability Requirement

AI mora za vsak proposal dati:
	•	reasoning summary
	•	expected impact
	•	confidence level
	•	risk classification
	•	rollback complexity

No explainability:

→ no execution

⸻

9. Audit Trail

Vsaka sprememba mora imeti:

who proposed
who approved
who executed
AI version
site version
timestamp
impact score

This is:

👉 core enterprise trust layer

⸻

10. Rollback Governance

Rollback mora biti:
	•	instant
	•	permission-controlled
	•	AI-suggestable
	•	operator-enforced

AI lahko:

→ propose rollback

AI ne sme:

→ force rollback

⸻

11. Learning Governance

AI learning mora biti:
	•	cross-tenant anonymized
	•	reversible
	•	explainable
	•	bias-auditable

Agency mora imeti možnost:

→ opt-out learning

⸻

12. Safety Constraints

AI nikoli ne sme:
	•	publish HIGH risk without approval
	•	modify billing
	•	change auth
	•	alter permissions
	•	inject scripts without trust layer
	•	break runtime guarantees

⸻

13. Operator Experience Philosophy

Operator UI mora:
	•	reduce cognitive load
	•	surface only meaningful decisions
	•	group related proposals
	•	visualize impact
	•	show risk clearly

System mora biti:

👉 calm AI system

Not:
	•	noisy AI spam machine

⸻

14. Autonomy Evolution Model

V1:

→ approval-first AI

V2:

→ semi-autonomous AI

V3:

→ outcome-driven AI

But:

Trust must scale with autonomy.