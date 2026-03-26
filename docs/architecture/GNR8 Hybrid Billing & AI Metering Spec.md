# GNR8 Hybrid Billing & AI Metering Spec
Status: DRAFT
Owner: GNR8 Core Architecture
Scope: Defines hybrid billing architecture including subscriptions, AI usage metering, hosting costs, migration credits, and agency → client billing flows.

Depends On:
- GNR8 Ownership Architecture Spec
- GNR8 Platform Operating Model
- GNR8 Runtime Engine Spec
- GNR8 Migration Execution Strategy
- Stripe Billing Integration (existing partial implementation)

---

# 1. PURPOSE

Hybrid Billing defines how GNR8 monetizes platform usage while enabling agency-first economics.

Goals:
• enable frictionless migration of existing agency clients  
• ensure platform sustainability via AI + infra cost recovery  
• support agency reselling model  
• allow gradual monetization scaling  
• enable future marketplace economics  

Hybrid billing must support:

Early Phase → Agency cost ≈ 0€  
Growth Phase → Optional platform revenue share  
Scale Phase → Full platform monetization  

---

# 2. CORE BILLING PRINCIPLES

### 2.1 Agency-First Monetization

Default rule:

Agency bills client.  
GNR8 bills agency.

Except:

AI usage may be billed directly by platform infrastructure.

This allows:

• agency margin protection  
• platform cost recovery  
• scalable growth model  

---

### 2.2 Hybrid Revenue Streams

GNR8 revenue sources:

1. AI usage metering  
2. hosting / runtime infra  
3. migration credits  
4. premium platform features  
5. optional revenue share  
6. enterprise tooling  

---

### 2.3 Monetization Evolution

Phase model:

Early:
• no platform fee
• only AI + infra pass-through

Growth:
• optional revenue share
• premium modules

Scale:
• mandatory platform take-rate
• ecosystem monetization

---

# 3. BILLING ENTITY MODEL

Core billing hierarchy:

Platform
  → Agency
    → Client
      → Site
        → Runtime usage
        → AI usage
        → Hosting usage

---

### 3.1 Agency Billing Account

Agency owns:

• client relationships  
• pricing strategy  
• client subscription packaging  

Agency receives:

• client payments  
• usage analytics  
• billing reports  

Agency pays platform for:

• infrastructure usage  
• AI consumption  
• migration services  

---

### 3.2 Client Billing Ownership

Client owns:

• published production sites  
• domain-bound runtime costs  
• AI improvements applied to site  

Client may not directly interact with platform billing layer.

---

### 3.3 Site-Level Billing Attribution

Each site must have:

SiteBillingProfile:
  ownerType: AGENCY | CLIENT
  billingAccountId
  runtimeCostCenterId
  aiUsageCostCenterId

---

# 4. SUBSCRIPTION MODEL

### 4.1 Subscription Scope

Subscriptions can exist at:

• agency level (platform subscription)
• client level (service subscription)
• site level (hosting subscription)

---

### 4.2 Subscription Types

PlatformSubscription:
• platform plan
• feature entitlements

ClientServiceSubscription:
• website management package
• AI optimization package
• hosting bundle

UsageSubscription:
• AI token metering
• infra metering

---

# 5. AI METERING MODEL

### 5.1 AI Metering Philosophy

AI is:

• core platform capability  
• variable cost driver  
• measurable resource  

AI metering must be:

• precise  
• explainable  
• attributable  
• auditable  

---

### 5.2 Metering Dimensions

AI usage measured by:

• tokens (LLM)
• compute time
• model tier
• agent execution cycles
• optimization operations
• migration processing

---

### 5.3 AI Usage Attribution

Each AI action must resolve:

AIUsageEvent:
  agencyId
  clientId
  siteId
  featureContext
  tokenCount
  costEstimate
  executionTraceId

---

### 5.4 AI Cost Attribution Rules

Default:

Migration AI → agency cost  
Optimization AI → client cost  
Experimental AI → agency cost  
Autonomous AI → configurable  

---

# 6. HOSTING / RUNTIME BILLING

Runtime costs include:

• CDN usage
• edge compute
• asset storage
• bandwidth
• SSR compute (if enabled)

Runtime billing must support:

• site-level cost tracking
• aggregated agency reporting
• anomaly detection

---

# 7. MIGRATION BILLING

Migration is billed via:

MigrationCredits:

Types:
• per-site migration
• bulk migration packages
• enterprise migration waves

Credits consumed by:

• snapshot processing
• layout graph computation
• canonical reconstruction
• artifact generation

---

# 8. BILLING DATA MODEL

### 8.1 Core Tables

billing_accounts  
subscriptions  
usage_events  
ai_usage_events  
runtime_usage_events  
migration_credit_events  
invoices  
payments  

---

### 8.2 Cost Centers

Each cost must map to:

CostCenter:
  type: PLATFORM | AGENCY | CLIENT | SITE
  entityId
  parentCostCenterId

---

# 9. STRIPE INTEGRATION MODEL

Stripe responsibilities:

• payment processing  
• subscription lifecycle  
• invoice generation  
• customer management  

Platform responsibilities:

• usage metering  
• entitlement enforcement  
• billing attribution  
• revenue analytics  

---

### 9.1 Stripe Customer Mapping

StripeCustomer:
  billingAccountId
  stripeCustomerId
  billingScope

---

### 9.2 Stripe Event Coverage (Target)

Required events:

• checkout.session.completed
• invoice.created
• invoice.paid
• invoice.payment_failed
• subscription.updated
• subscription.deleted
• usage_record.created

---

# 10. BILLING → GOVERNANCE BRIDGE

Billing state influences:

• runtime enforcement
• feature access
• AI usage limits
• publish permissions
• migration eligibility

Example:

If unpaid → site publish blocked.

---

# 11. AGENCY ECONOMICS ENGINE

Agency margin model:

Client price = agency defined  
Platform cost = measured  

Agency margin = price − platform cost  

Platform may:

• enforce minimum pricing
• offer margin analytics
• suggest pricing optimization

---

# 12. AI USAGE UI MODEL

Platform must expose:

• real-time AI cost dashboard
• per-site AI consumption
• anomaly alerts
• optimization ROI analytics

Inspired by:

Codex / OpenAI usage dashboard.

---

# 13. FUTURE EXTENSIONS

Future monetization:

• AI marketplace
• template marketplace
• plugin ecosystem
• optimization revenue share
• autonomous commerce agents

---

# 14. BILLING SAFETY RULES

Billing must never:

• block runtime without explainability
• create hidden costs
• misattribute usage
• mix agency and client ownership
• allow unbounded AI spending

---

# 15. FOUNDER DIRECTIVE

Hybrid billing is strategic infrastructure.

If billing is:

Too aggressive → agencies will not migrate.  
Too weak → platform cannot scale.  

Correct model:

Agency-first → Platform-sustainable → AI-driven growth.

GNR8 billing must feel:

Fair  
Transparent  
Predictable  
Powerful  

Billing is not finance.

Billing is:

Platform growth engine.