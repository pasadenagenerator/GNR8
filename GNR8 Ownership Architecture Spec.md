# GNR8 Ownership Architecture Spec

Status: DRAFT
Owner: GNR8 Core Architecture
Scope: Defines the ownership domain model for agencies, clients, sites, billing responsibility, AI usage attribution, and lifecycle transfer rules

Depends On:
- GNR8 Migration Architecture Blueprint
- GNR8 Runtime Engine Spec
- GNR8 Migration Governance Spec
- GNR8 Canonical Data Model Spec
- GNR8 Platform Operating Model (pending)
- GNR8 Hybrid Billing & AI Metering Spec (pending)

---

## 1. Purpose

This document defines the ownership architecture of GNR8.

It answers:

- who owns what
- who pays for what
- who governs what
- who can operate what
- how ownership changes over time
- how migration, runtime, billing, and AI usage map to business entities

This is not only a billing model.

It is the business-control model of the platform.

---

## 2. Core Principle

GNR8 is an agency-centric platform.

That means:

- Agency is the primary operational owner
- Client is the primary production owner
- Platform is infrastructure, not business owner
- Production sites are client assets
- Migration work is agency work
- AI migration cost belongs to agency
- Live runtime AI cost belongs to client, but is invoiced to agency by default

Default commercial model:

Agency pays → re-bills client

---

## 3. Ownership Hierarchy

Canonical hierarchy:

Platform
└ Agency
  └ Client
    └ Site
      └ Site Version
        └ Artifact

This is a hard invariant.

Rules:
- every client belongs to exactly one agency at a time
- every production site belongs to exactly one client
- every client belongs to an agency, including default home agency
- every site version belongs to exactly one site
- every artifact belongs to exactly one site version

---

## 4. Primary Entities

### 4.1 Agency

Agency is the top-level operational tenant.

Agency is responsible for:
- billing relationship to GNR8
- migration execution
- client portfolio management
- AI usage pool management
- templates
- experimental sites
- operator access and permissions

Agency is NOT:
- the permanent owner of production sites
- the final owner of client domains

Agency is the default payer and operator.

---

### 4.2 Client

Client is the business entity for whom sites are built, migrated, and operated.

Client owns:
- production sites
- production domains
- production runtime identity
- business-facing content and brand presence

Client does NOT need to be the direct payer to GNR8.
By default, agency pays and re-bills client.

Client is always attached to one agency.
If no external agency exists, client is assigned to the platform home agency.

---

### 4.3 Site

A Site is the main operational web property unit in GNR8.

A Site can exist in multiple lifecycle types:

- experimental
- template
- migration-in-progress
- shadow
- production

Ownership depends on lifecycle type.

---

### 4.4 Site Version

Site Version is the immutable versioned content/runtime lineage object for a site.

It represents:
- canonical page set
- migration governance state
- runtime eligibility state
- publish candidate lineage

Site Version ownership follows site ownership.
It is never independently owned.

---

### 4.5 Artifact

Artifact is the deployable runtime output derived from a site version.

Artifact ownership follows site version ownership.
Artifact is never independently billed or independently owned.

It is a runtime execution object.

---

## 5. Site Ownership by Lifecycle

### 5.1 Experimental Site

Owner: Agency

Used for:
- internal exploration
- AI sandboxing
- design experiments
- draft work
- early prototypes

Experimental sites are not client-owned unless explicitly converted into client sites.

Billing:
- agency absorbs cost
- AI usage attributed to agency

---

### 5.2 Template Site

Owner: Agency

Templates are agency assets before publication.
They may later become:
- private agency templates
- marketplace templates
- basis for client sites

If a template is instantiated and published for a client, the resulting production site is client-owned.

Billing:
- template creation cost belongs to agency
- template maintenance belongs to agency
- published derived site cost follows client production rules

---

### 5.3 Migration-in-Progress Site

Owner: Agency

This includes:
- URL ingestion
- ZIP/package ingestion
- structural reconstruction
- canonical assembly
- quality gating
- artifact build
- shadow-preparation

Until a site becomes a client production property, it remains agency-owned operational work.

Billing:
- migration AI cost belongs to agency
- migration operations belong to agency

---

### 5.4 Shadow Site

Owner: Agency

Even when a client can review it, a shadow site remains operationally owned by agency until production promotion.

Reason:
- migration responsibility remains with agency
- shadow is still a validation environment
- costs and decisions remain operational, not final

Client may have:
- preview access
- review access
- approval rights

But not full ownership until production activation.

---

### 5.5 Production Site

Owner: Client

This is a hard rule.

Production site is:
- client-owned
- client-branded
- client-domain-bound
- client runtime identity

Agency may still operate it, but is not the final business owner.

Billing default:
- agency pays platform
- agency re-bills client

Future extensibility:
- direct client billing
- split billing
- mixed billing

---

## 6. Billing Ownership Model

### 6.1 Default Commercial Model

Default:
Agency pays → re-bills client

This applies to:
- platform subscription
- runtime subscription
- AI usage billing
- migration work billing

Why:
- agency is the distribution channel
- agency manages client portfolio
- agency is operational root
- agency absorbs and reallocates platform cost

---

### 6.2 Billing Responsibility Layers

GNR8 billing has two layers:

#### Fixed Billing
Examples:
- agency platform plan
- runtime/site plan
- support tier
- environment tier

#### Variable Billing
Examples:
- AI token usage
- migration AI reasoning
- optimization AI usage
- content generation
- proposal generation
- mutation planning/execution

---

### 6.3 Billing Scope Units

Billing can attach to:

- agency
- client
- site
- operation

Default near-term model:
- invoice payer = agency
- usage attribution = agency and client aware
- operational chargeback = agency internal logic

Future model:
- configurable payer per client/site

---

## 7. AI Usage Attribution Model

### 7.1 Migration AI Usage

Owner: Agency

Includes:
- crawl reasoning
- structural reconstruction AI
- canonical enhancement AI
- migration proposal AI
- migration diagnostics AI

Reason:
migration is an agency service operation.

---

### 7.2 Runtime AI Usage

Default owner: Agency-billed, client-attributed

Includes:
- post-launch optimization
- content generation
- AI recommendations
- mutation proposals
- live site AI operations

Business meaning:
- platform invoices agency
- agency can re-bill client
- system must attribute usage to client/site for reporting

---

### 7.3 Usage Attribution Requirements

Every AI-consuming operation must be attributable to:

- agencyId
- clientId if applicable
- siteId if applicable
- operationType
- usage class
- token/cost metrics
- timestamp
- model/provider identity if needed later

This is mandatory for hybrid billing.

---

## 8. Ownership Transfer Rules

### 8.1 Client Transfer Between Agencies

Supported: Yes

If client leaves one agency and joins another:
- client ownership moves
- production site ownership remains with client
- operational management moves to new agency
- billing responsibility moves according to reassignment flow
- historical lineage remains preserved

Required future capability:
- agency transfer workflow
- billing reassignment
- access reassignment
- site governance reassignment

---

### 8.2 Agency Shutdown

If agency shuts down:
- clients must be transferable to another agency
- platform may temporarily hold clients in home agency if needed
- client production ownership must survive agency failure

This is a resilience requirement.

---

### 8.3 Template Reuse

Templates remain agency-owned unless explicitly published into client production.

Published client site is never treated as a template asset.
It is a client production asset derived from a template.

---

## 9. Default Home Agency

GNR8 must support a default platform-owned agency:

Home Agency

Purpose:
- fallback client assignment
- direct onboarding before partner agency assignment
- internal migrations
- internal experimentation
- emergency operational takeover

This is not the same as platform ownership.
It is an operational default agency tenant.

---

## 10. Permissions and Operational Control

Ownership and permissions are not identical.

### Agency permissions
Agency can:
- create and manage clients
- create experimental sites
- run migrations
- manage templates
- operate client production sites if authorized
- review AI usage and billing attribution
- approve migrations/publishes depending on role

### Client permissions
Client can:
- review shadow sites
- approve production moves
- access production reporting
- access content/runtime views depending on product design
- become future direct billing target if model expands

### Platform permissions
Platform can:
- enforce governance
- enforce billing policy
- enforce operational safety
- host home agency
- provide transfer workflows

Platform should not act as normal site owner.

---

## 11. Ownership Invariants

Hard invariants:

1. Every client belongs to one agency
2. Every production site belongs to one client
3. Every experimental site belongs to one agency
4. Every template belongs to one agency unless marketplace model later extends it
5. Migration AI usage belongs to agency
6. Runtime AI usage must be attributable to client/site even if billed to agency
7. Site versions and artifacts inherit ownership from site
8. Ownership transfer must preserve lineage and audit history
9. Production ownership never silently falls back to platform
10. Platform is infrastructure authority, not business owner

---

## 12. Data Model Implications

This ownership model implies the need for these domain relationships:

### Agency
- agencyId
- organizationId or equivalent root tenant binding
- billingAccountId
- operational status

### Client
- clientId
- agencyId
- billing profile fields
- lifecycle state
- transfer status if applicable

### Site
- siteId
- clientId nullable only for experimental/template phase
- agencyId always present
- siteType
- lifecycleState
- billingScope

### Site Version
- siteVersionId
- siteId
- ownership inherited
- governance state
- publish state

### Artifact
- artifactId
- siteVersionId
- ownership inherited
- publishStage
- governance metadata

This should become a formal engineering data contract later.

---

## 13. Governance Implications

Governance decisions must eventually consider both:

### Technical Governance
- migration gate
- rollout policy
- enforcement state
- artifact integrity
- runtime eligibility

### Commercial Governance
- subscription status
- entitlement status
- payer status
- AI usage limits
- plan restrictions

Ownership is the bridge between the two.

---

## 14. Migration Ops Implications for 200 Sites

This model supports:
- one agency managing 200 clients
- each client owning one or more production sites
- agency absorbing migration cost
- agency controlling migration queue
- client receiving production ownership after go-live
- AI usage attribution across agency/client/site levels

This is the correct foundation for your current business case.

---

## 15. Future Extensibility

This model intentionally allows future expansion to:
- multi-agency ecosystem
- agency transfer workflows
- client direct billing
- client self-managed mode
- template marketplace
- usage budgets
- prepaid AI credits
- site-level metering
- hybrid invoicing models

But default system behavior remains:
agency-first, client-owned production.

---

## 16. Founder Directive

GNR8 is not a builder.

GNR8 is not a generic website SaaS.

GNR8 is an agency-centric AI web operating system.

Agency operates.
Client owns production.
Platform governs.
Billing follows ownership.
AI usage follows operational reality.

This ownership model is the foundation of everything that follows:
- billing
- migration
- runtime
- governance
- operations
- scale