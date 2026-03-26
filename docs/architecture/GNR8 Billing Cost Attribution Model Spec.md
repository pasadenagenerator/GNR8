# GNR8 Billing Cost Attribution Model Spec

Status: DRAFT
Owner: GNR8 Core Architecture
Scope: Defines how migration, runtime, hosting, and AI costs are attributed across agency, client, site, and operation layers

Depends On:
- GNR8 Ownership Architecture Spec
- GNR8 Ownership Runtime Binding Spec
- GNR8 Hybrid Billing & AI Metering Spec
- GNR8 Platform Operating Model
- GNR8 Migration Command Center Spec

---

## 1. Purpose

This spec defines how cost attribution works inside GNR8.

It answers:

- who financially owns migration cost
- who operationally owns AI cost
- who benefits from runtime cost
- how site-level cost is attributed
- how agency payer and client beneficiary remain separate
- how costs later map into Stripe billing and agency reporting

This is not payment processing.

This is the internal truth model for cost attribution.

---

## 2. Core Principle

Billing collection and cost attribution are not the same thing.

In GNR8:

- Agency is the default payer
- Client is often the economic beneficiary
- Site is the runtime attribution anchor
- Operation is the usage attribution unit

Canonical rule:

Cost is attributed by operational reality,
not by convenience of invoicing.

---

## 3. Attribution Hierarchy

Every billable event in GNR8 must resolve through this hierarchy:

Operation
→ Site (if applicable)
→ Client (if applicable)
→ Agency
→ Platform billing account

This is the canonical attribution chain.

Examples:

### Migration AI event
MigrationJob
→ Site (optional early, required later)
→ Agency
→ Platform

### Runtime AI event
AI optimization
→ Site
→ Client
→ Agency payer
→ Platform

### Hosting event
Runtime artifact serving
→ Site
→ Client
→ Agency payer
→ Platform

---

## 4. Cost Types

GNR8 cost attribution must support four major cost families:

### 4.1 Migration Cost

Includes:
- snapshot processing
- layout graph computation
- canonical assembly
- governance computation
- artifact generation
- migration operator-assisted AI

Default attribution:
- cost owner = Agency
- payer = Agency
- client attribution optional for reporting only

Migration is an agency service operation.

---

### 4.2 Runtime Cost

Includes:
- artifact serving
- edge runtime
- bandwidth
- asset storage
- host-bound delivery

Default attribution:
- cost beneficiary = Client
- payer = Agency
- site attribution = required

---

### 4.3 AI Optimization Cost

Includes:
- content generation
- layout proposal generation
- optimization recommendations
- mutation planning
- campaign/analytics AI
- future autonomous site intelligence

Default attribution:
- cost beneficiary = Client
- payer = Agency
- site attribution = required

---

### 4.4 Experimental / Template Cost

Includes:
- draft environments
- sandbox AI usage
- template generation
- internal experimentation

Default attribution:
- cost owner = Agency
- payer = Agency
- client attribution = none

---

## 5. Attribution Anchors

### 5.1 Agency Anchor

Every billable event must resolve to exactly one Agency.

This is mandatory.

Reason:
- platform invoices agency by default
- agency is operational root
- AI budgets and account-level controls live here

### 5.2 Client Anchor

A billable event resolves to a Client only when:
- the Site is client-associated
- or the operation is explicitly client-facing

Some events will remain agency-only.

### 5.3 Site Anchor

Site is the runtime attribution anchor.

All runtime, hosting, and live AI costs must resolve to Site.

Without Site-level attribution:
- reporting becomes unreliable
- cost analytics become unreliable
- future pricing becomes unreliable

### 5.4 Operation Anchor

Operation is the smallest billable unit.

Examples:
- one migration job
- one activation
- one AI generation
- one AI optimization pass
- one runtime request aggregation window
- one template generation run

---

## 6. Attribution Context Model

Every billable event must carry attribution context.

### 6.1 Required Attribution Context

```txt
BillingAttributionContext {
  agencyId
  clientId? 
  siteId?
  siteVersionId?
  artifactId?
  migrationJobId?
  operationType
  costType
  billingScope
  lifecyclePhase
}

6.2 Why This Matters

This context allows:
	•	later invoicing
	•	cost center analytics
	•	AI usage dashboards
	•	migration profitability analysis
	•	agency margin tracking

No billable event may be created without attribution context.

⸻

7. Billing Scope Rules

7.1 Billing Scope Enum

Billing scope may be:
	•	agency
	•	client
	•	site
	•	operation

This does NOT define payer directly.
It defines the intended attribution level.

7.2 Default Scope Mapping

Migration
	•	billingScope = agency

Experimental / template work
	•	billingScope = agency

Production hosting
	•	billingScope = site

Production AI optimization
	•	billingScope = site

Future premium subscriptions
	•	billingScope = client or agency depending on package

⸻

8. Lifecycle-Based Attribution Rules

8.1 Experimental Site

Owner:
	•	Agency

Billing attribution:
	•	Agency only

8.2 Migration Site

Owner:
	•	Agency operationally

Billing attribution:
	•	Agency payer
	•	Site attribution optional
	•	Client attribution optional until assignment is stable

8.3 Shadow Site

Owner:
	•	Agency operationally

Billing attribution:
	•	Agency payer
	•	Site attribution required
	•	Client attribution allowed if target client known

8.4 Production Site

Owner:
	•	Client

Billing attribution:
	•	Site attribution required
	•	Client attribution required
	•	Agency remains default payer

⸻

9. Cost Center Model

GNR8 must support internal cost centers.

9.1 Cost Center Types

CostCenterType:
- PLATFORM
- AGENCY
- CLIENT
- SITE
- OPERATION

9.2 Cost Center Resolution

Every billable event must resolve to:
	•	one primary cost center
	•	zero or more parent cost centers

Example:

AI optimization event
→ OPERATION cost center
→ SITE parent
→ CLIENT parent
→ AGENCY parent

This enables:
	•	drill-down analytics
	•	chargeback
	•	profitability reporting
	•	future settlement models

⸻

10. AI Token Attribution

10.1 Required AI Metering Fields

Every AI event must record:

AIUsageEvent {
  agencyId
  clientId?
  siteId?
  operationType
  featureContext
  modelProvider
  modelName
  promptTokens
  completionTokens
  totalTokens
  estimatedCost
  timestamp
  executionTraceId
}

10.2 Migration AI Rule

Migration AI cost belongs to Agency.

Even if a target client is already known,
migration AI remains an agency service cost by default.

10.3 Production AI Rule

Production AI cost belongs to Site / Client context,
while payer remains Agency by default.

This is critical for future reporting and rebilling.

⸻

11. Runtime Cost Attribution

11.1 Runtime Billing Event

Runtime usage should eventually aggregate into billable windows, not single requests.

Example aggregation unit:
	•	per site / per hour
	•	per site / per day
	•	per site / per billing cycle

11.2 Runtime Attribution Fields

RuntimeUsageEvent {
  agencyId
  clientId
  siteId
  artifactId?
  hostBindingId?
  requestCount
  bandwidthBytes
  assetBytes
  computeMs
  estimatedCost
  periodStart
  periodEnd
}

11.3 Runtime Rule

No production runtime cost should be unattributed to Site.

⸻

12. Migration Credit Attribution

12.1 Migration Credits

Migration work may later be priced using credits.

Credit consumption must still be attributable to:
	•	agency
	•	migration job
	•	site if known
	•	source type (URL / ZIP)
	•	complexity class

12.2 Why This Matters

This allows:
	•	migration profitability analytics
	•	fixed-price migration packs
	•	enterprise migration wave pricing
	•	internal operator efficiency analysis

⸻

13. Agency Margin Model

13.1 Platform View

Platform sees:
	•	measured cost
	•	attributed cost
	•	billed payer
	•	optional recommended markup

13.2 Agency View

Agency should later see:
	•	site cost
	•	client cost
	•	AI spend
	•	hosting spend
	•	migration spend
	•	margin opportunity

13.3 Key Rule

GNR8 must not confuse:
platform cost truth
with
agency resale pricing

They are different layers.

⸻

14. Stripe Mapping Implications

14.1 Stripe Is Settlement, Not Attribution Truth

Stripe handles:
	•	payment collection
	•	subscriptions
	•	invoices

GNR8 attribution model handles:
	•	operational cost truth
	•	usage attribution
	•	client/site cost distribution
	•	payer mapping

14.2 Mapping Rule

One Stripe customer may correspond to:
	•	one agency billing account
	•	later possibly one client billing account

But internal GNR8 cost attribution must remain richer than Stripe’s customer model.

⸻

15. Reporting Requirements

The system must eventually support reporting by:

Agency
	•	total platform spend
	•	total AI spend
	•	migration spend
	•	runtime spend
	•	per-client profitability

Client
	•	site-level cost breakdown
	•	AI-driven improvement cost
	•	hosting/runtime cost

Site
	•	migration cost history
	•	runtime cost trend
	•	AI optimization spend trend

⸻

16. Invariants

Hard rules:
	1.	Every billable event must resolve to exactly one Agency
	2.	Every production runtime event must resolve to exactly one Site
	3.	Migration cost defaults to Agency
	4.	Experimental and template cost defaults to Agency
	5.	Production AI cost must be attributable to Site/Client
	6.	Payer and beneficiary may differ
	7.	Stripe customer identity must not replace attribution truth
	8.	No billable event may be created without attribution context
	9.	Site is the anchor for runtime and production AI attribution
	10.	Cost attribution must remain explainable and auditable

⸻

17. V1 Scope

V1 must support:
	•	agency-level payer model
	•	client/site attribution model
	•	migration cost attribution
	•	runtime cost attribution model
	•	AI usage attribution model
	•	future-ready Stripe mapping

V1 does not require yet:
	•	direct client billing
	•	automated chargeback
	•	marketplace settlement
	•	dynamic pricing engine
	•	live agency margin dashboards

⸻

18. Future Extensions

Later this model may support:
	•	direct client payer mode
	•	split billing
	•	prepaid AI credits
	•	per-site budgets
	•	AI usage caps
	•	usage anomaly shutdown policies
	•	marketplace revenue split
	•	platform take-rate

⸻

19. Founder Directive

Cost attribution is not accounting detail.

It is platform truth.

If GNR8 cannot answer:
	•	which agency paid
	•	which client benefited
	•	which site consumed
	•	which operation generated cost

then billing, reporting, pricing, and AI economics will fail.

This model makes cost real, attributable, and platform-safe.