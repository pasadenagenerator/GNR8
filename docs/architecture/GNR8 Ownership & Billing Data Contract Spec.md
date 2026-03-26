# GNR8 Ownership & Billing Data Contract Spec

Status: DRAFT
Owner: GNR8 Core Architecture
Scope: Defines concrete data contracts, tables, relations, enums, and invariants for ownership and billing attribution

Depends On:
- GNR8 Ownership Architecture Spec
- GNR8 Ownership Runtime Binding Spec
- GNR8 Billing Cost Attribution Model Spec
- GNR8 Hybrid Billing & AI Metering Spec
- 20260326_ownership_foundation.sql

---

# 1. PURPOSE

This spec converts architecture into executable data contracts.

It defines:

• canonical tables
• required fields
• ownership relationships
• billing attribution structure
• enums and constraints
• invariants
• migration expectations

This is the source of truth for:
→ DB schema evolution
→ repository layer
→ billing attribution
→ runtime ownership queries

---

# 2. CORE ENTITY GRAPH

Canonical structure:

Agency
→ Organization (Client)
→ Site
→ Site Version
→ Artifact
→ Runtime / AI / Migration Events

Billing attribution resolves through this graph.

---

# 3. AGENCIES

Table: agencies

Fields:
- id (uuid pk)
- name (text)
- slug (text unique)
- is_home_agency (boolean)
- created_at (timestamptz)
- updated_at (timestamptz)

Constraints:
- exactly one row must have is_home_agency = true

---

# 4. ORGANIZATIONS

Table: organizations (existing, extended)

Add:

- agency_id (uuid fk → agencies.id)
- organization_type (enum)

Enum: organization_type
- agency
- client
- internal

Rules:

• every organization must belong to an agency  
• client org must have agency_id  
• agency org may map 1:1 with agencies (future consolidation possible)

---

# 5. SITES (PRIMARY OWNERSHIP ANCHOR)

Table: sites

Fields:
- id (uuid pk)
- agency_id (uuid fk → agencies.id)
- org_id (uuid fk → organizations.id)  // client owner
- status (enum)
- domain (text nullable)
- is_template (boolean)
- billing_scope (enum)
- billing_locked (boolean)
- created_at
- updated_at

Enum: site_status
- draft
- migrating
- shadow
- live
- archived

Enum: billing_scope
- agency
- client

---

## 5.1 Site Invariants

1. Live site:
   - domain NOT NULL
   - is_template = false
   - org_id must be client

2. Template site:
   - is_template = true
   - domain must be NULL
   - org_id must be agency org

3. Shadow / migrating:
   - agency-owned operationally
   - domain optional

---

# 6. SITE VERSIONS (RUNTIME LINK)

Table: gnr8_runtime_site_versions (existing, extended)

Add:

- ownership_site_id (uuid fk → sites.id)

Rules:

• every active site_version MUST have ownership_site_id  
• ownership_site_id must not change after activation  
• legacy site_id field remains untouched  

---

# 7. ARTIFACT OWNERSHIP CONTRACT

Artifacts do NOT get ownership columns.

Ownership must be resolved via:

artifact
→ site_version
→ ownership_site_id
→ site
→ agency/client

Required:

Every artifact resolution path must return:

- site_id
- agency_id
- client org_id (if production)
- publish_stage

---

# 8. MIGRATION JOBS

Table: migration_jobs (existing, extended)

Add:

- agency_id (uuid)
- site_id (uuid nullable)
- migration_owner_type (enum)

Enum: migration_owner_type
- agency
- client

Rules:

• migration_job must always have agency_id  
• site_id may be NULL at intake  
• once assigned → must remain stable  

---

# 9. BILLING ENTITIES

## 9.1 Billing Accounts

Table: billing_accounts

Fields:
- id (uuid pk)
- agency_id (uuid)
- stripe_customer_id (text nullable)
- billing_mode (enum)
- created_at

Enum: billing_mode
- agency_pays
- hybrid
- client_direct (future)

---

## 9.2 Subscriptions

Table: subscriptions (existing, extendable)

Fields:
- id
- billing_account_id
- scope_type (enum)
- scope_id
- stripe_subscription_id
- status
- current_period_end

Enum: scope_type
- agency
- client
- site

---

# 10. USAGE EVENTS (CORE CONTRACT)

## 10.1 AI Usage Events

Table: ai_usage_events

Fields:

- id
- agency_id (required)
- client_id (nullable)
- site_id (nullable)
- site_version_id (nullable)
- artifact_id (nullable)
- operation_type
- feature_context
- model_provider
- model_name
- prompt_tokens
- completion_tokens
- total_tokens
- estimated_cost
- created_at
- trace_id

---

## 10.2 Runtime Usage Events

Table: runtime_usage_events

Fields:

- id
- agency_id
- client_id
- site_id
- artifact_id
- request_count
- bandwidth_bytes
- compute_ms
- estimated_cost
- period_start
- period_end

---

## 10.3 Migration Cost Events

Table: migration_cost_events

Fields:

- id
- agency_id
- site_id (nullable)
- migration_job_id
- cost_type
- compute_units
- estimated_cost
- created_at

---

# 11. COST CENTER MODEL

Table: cost_centers

Fields:
- id
- type (enum)
- entity_id
- parent_id

Enum: cost_center_type
- agency
- client
- site
- operation

Rules:

• every usage event must resolve to at least one cost center  
• cost centers must form a hierarchy  

---

# 12. REQUIRED RESOLUTION FUNCTIONS

System must support resolving:

### resolveSiteOwnership(site_id)
→ agency_id
→ client_id
→ billing_scope
→ lifecycle

### resolveArtifactOwnership(artifact_id)
→ site_version
→ site
→ agency
→ client

### resolveBillingContext(event)
→ agency_id
→ client_id
→ site_id
→ cost_center_id

---

# 13. RELATIONSHIP SUMMARY

agency
→ organizations
→ sites
→ migration_jobs
→ billing_accounts

client (organization)
→ sites

site
→ site_versions
→ runtime usage
→ AI usage
→ migration attribution

site_version
→ artifacts

artifact
→ runtime resolution
→ billing attribution via site_version

---

# 14. BACKWARD COMPATIBILITY

Required guarantees:

• no existing runtime queries break  
• legacy site_id continues to function  
• no publish flow changes  
• no migration logic changes  
• no Stripe logic changes  

Ownership fields are additive only.

---

# 15. INDEX REQUIREMENTS

Required indexes:

- sites(agency_id)
- sites(org_id)
- sites(domain)
- ai_usage_events(site_id)
- runtime_usage_events(site_id)
- migration_jobs(agency_id)

---

# 16. INVARIANTS

Hard rules:

1. Site is ownership anchor  
2. Site Version must link to Site  
3. Artifact must inherit ownership  
4. Every usage event must resolve to Agency  
5. Every production runtime event must resolve to Site  
6. Migration jobs must always belong to Agency  
7. Template sites must not have domain  
8. Live sites must belong to client  
9. Billing attribution must follow ownership graph  
10. No ownership ambiguity allowed for activated runtime  

---

# 17. V1 SCOPE

Must support:

• agency → client → site hierarchy  
• runtime ownership resolution  
• migration job ownership  
• AI usage attribution  
• runtime usage attribution  
• billing preparation layer  

Does not yet require:

• direct client billing  
• marketplace settlement  
• pricing engine  
• advanced entitlements  

---

# 18. FOUNDER DIRECTIVE

This is not just schema.

This is the foundation of:

• billing correctness  
• migration scalability  
• runtime trust  
• agency operations  
• AI economics  

If this layer is wrong:
everything built on top becomes unstable.

If this layer is correct:
GNR8 becomes a true platform.