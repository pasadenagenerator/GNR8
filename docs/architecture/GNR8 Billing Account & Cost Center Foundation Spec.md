# GNR8 Billing Account & Cost Center Foundation Spec

Status: DRAFT
Owner: GNR8 Core Architecture
Scope: Defines billing accounts, payer model, and cost center hierarchy as the foundation for cost attribution and future Stripe integration

Depends On:
- GNR8 Ownership Architecture Spec
- GNR8 Ownership Runtime Binding Spec
- GNR8 Ownership & Billing Data Contract Spec
- GNR8 Billing Cost Attribution Model Spec
- GNR8 Client Assignment Workflow Spec

---

# 1. Purpose

This spec defines:

• who pays  
• how costs are grouped  
• how usage maps to billing accounts  
• how cost centers structure internal attribution  

This is the foundation layer before:
→ Stripe checkout
→ invoices
→ subscriptions
→ pricing models

---

# 2. Core Principle

Separate:

**who pays**  
from  
**who consumes**

Canonical model:

Agency → payer  
Client → beneficiary  
Site → attribution anchor  
Operation → cost unit  

---

# 3. Billing Account

## 3.1 Definition

A Billing Account represents the entity that is financially responsible for platform usage.

V1 rule:

Every agency has exactly one billing account.

---

## 3.2 Table

```txt
billing_accounts

- id (uuid pk)
- agency_id (uuid fk → agencies.id)
- stripe_customer_id (text nullable)
- billing_mode (enum)
- status (enum)
- created_at
- updated_at


⸻

3.3 Enums

billing_mode:
- agency_pays
- hybrid
- client_direct (future)

status:
- active
- suspended
- delinquent


⸻

3.4 Invariants
	1.	Every agency must have exactly one billing account
	2.	All billable events must resolve to a billing account
	3.	Billing account must be resolvable from any site

⸻

4. Cost Center Model

4.1 Purpose

Cost centers structure internal attribution.

They enable:
	•	per-client cost tracking
	•	per-site cost tracking
	•	AI usage reporting
	•	migration profitability
	•	future rebilling

⸻

4.2 Table

cost_centers

- id (uuid pk)
- type (enum)
- entity_id (uuid)
- parent_id (uuid nullable)
- created_at


⸻

4.3 Enum

cost_center_type:
- agency
- client
- site
- operation


⸻

4.4 Hierarchy

Agency
  → Client
    → Site
      → Operation

Example:

Agency: Pasadena Generator
  Client: Transporti Maver
    Site: maver.app
      Operation: AI optimization run


⸻

5. Cost Attribution Flow

Every cost event must resolve:

event
→ operation
→ site
→ client
→ agency
→ billing_account


⸻

6. Billing Resolution Function

System must support:

resolveBillingAccount(context)
→ billing_account_id
→ agency_id
→ client_id
→ site_id
→ cost_center_ids[]


⸻

7. Event → Cost Center Mapping

7.1 AI Usage

AI usage event
→ operation cost center
→ site cost center
→ client cost center
→ agency cost center


⸻

7.2 Runtime Usage

runtime usage
→ site cost center
→ client cost center
→ agency cost center


⸻

7.3 Migration Cost

migration job
→ operation cost center
→ agency cost center


⸻

8. Billing Scope Interaction

Site.billing_scope influences attribution:

agency → cost stays at agency level
client → cost attributed to site/client

Important:

billing_scope does NOT change payer
only attribution

⸻

9. Agency Payer Model (V1)

V1 rule:

Agency always pays the platform

Even when:
	•	cost belongs to client
	•	site is client-owned
	•	AI is used by client

Agency may later:
	•	re-bill client externally

⸻

10. Stripe Mapping (Future Layer)

Billing account maps to:

billing_accounts.stripe_customer_id

Future:
	•	subscriptions attach to billing account
	•	invoices generated per billing account
	•	usage aggregated per billing account

⸻

11. Required System Behavior

System must be able to answer:

For any cost event:
	•	which agency pays
	•	which client benefited
	•	which site generated cost
	•	which operation caused it

⸻

12. Minimal V1 Implementation

Must implement:
	•	billing_accounts table
	•	cost_centers table
	•	cost center hierarchy creation
	•	mapping logic in services
	•	no UI required yet
	•	no Stripe required yet

⸻

13. Data Creation Rules

13.1 On Agency Creation

→ create billing account
→ create agency cost center

⸻

13.2 On Client Creation

→ create client cost center
→ attach to agency

⸻

13.3 On Site Creation

→ create site cost center
→ attach to client

⸻

13.4 On Operation Execution

→ create operation cost center (optional in V1)
→ attach usage

⸻

14. Read Models

System must support:

getAgencyBillingOverview(agency_id)
	•	total cost
	•	breakdown by client
	•	breakdown by site

⸻

getClientCostBreakdown(client_id)
	•	site costs
	•	AI costs
	•	runtime costs

⸻

getSiteCostBreakdown(site_id)
	•	migration cost
	•	runtime cost
	•	AI cost

⸻

15. Invariants
	1.	Every cost must resolve to a billing account
	2.	Every production cost must resolve to a site
	3.	Agency is always payer in V1
	4.	Cost centers must form a valid hierarchy
	5.	No orphan cost events allowed
	6.	Billing attribution must be explainable

⸻

16. What This Unlocks

After this layer:
	•	AI usage billing
	•	runtime cost tracking
	•	migration pricing
	•	client-level reporting
	•	agency margin insight
	•	Stripe integration

⸻

17. V1 Scope

Include:
	•	billing account creation
	•	cost center creation
	•	cost attribution mapping

Exclude:
	•	Stripe checkout
	•	invoices
	•	UI dashboards
	•	rebilling automation

⸻

18. Future Extensions
	•	client billing accounts
	•	split billing
	•	prepaid credits
	•	usage caps
	•	automated rebilling
	•	marketplace revenue split

⸻

19. Founder Directive

Billing must not be guessed.

Billing must be derived.

If GNR8 cannot trace cost from:

operation → site → client → agency

then the platform cannot scale economically.

This layer makes cost traceable.

---

# Kaj imaš zdaj

Zdaj imaš:

## FULL CORE SYSTEM

- ownership ✔
- runtime ✔
- migration ✔
- publish ✔
- assignment ✔
- billing model ✔
- billing data layer ✔