GNR8 — User & Organization Model (Agencies, Clients, Users)

PURPOSE

This document defines the canonical user, agency, and client structure in GNR8.

It is the single source of truth for:
	•	how users are created
	•	how agencies operate
	•	how clients are represented
	•	how access is controlled

All future development (including AI/Codex) MUST follow this model.

⸻

CORE MODEL

GNR8 is a multi-tenant system with three primary layers:

Superadmin (platform)
→ Agency (tenant)
  → Client (customer of agency)
    → Sites (websites)

Users attach to this structure via memberships.

⸻

ENTITY DEFINITIONS

1. Superadmin (Platform Layer)

Represents:
	•	internal GNR8 operators

Capabilities:
	•	create agencies
	•	view all data (Command Center)
	•	override/debug
	•	never used for normal tenant access

⸻

2. Agency (Tenant Layer)

Represents:
	•	agency using GNR8
	•	primary business unit

Each agency has:
	•	organization record
	•	billing account
	•	cost centers
	•	memberships (users)

Agency is the main tenant boundary.

⸻

3. Client (Agency Customer)

Represents:
	•	end customer of an agency

Each client:
	•	belongs to exactly one agency
	•	owns one or more sites
	•	may optionally have its own users (later phase)

⸻

4. Site

Represents:
	•	website / store

Each site:
	•	belongs to exactly one agency
	•	optionally belongs to a client
	•	is the core unit for:
	•	migration
	•	runtime
	•	cost
	•	billing attribution

⸻

5. User

Represents:
	•	human identity (auth.users)

Users are NOT directly tied to sites.

They are linked via:

user → membership → organization (agency)


⸻

6. Membership

The most important table.

Defines:
	•	which user belongs to which agency
	•	what role they have

Fields:
	•	user_id
	•	organization_id (agency)
	•	role (owner | admin | member)

⸻

USER TYPES

1. Superadmin User
	•	internal
	•	bypasses tenant restrictions (via service-role)
	•	not part of agency RBAC

⸻

2. Agency User

Belongs to:
	•	exactly one or more agencies (via memberships)

Roles:
	•	owner → full control
	•	admin → operational control
	•	member → read-only / limited

Capabilities:
	•	see agency dashboard
	•	manage clients (future)
	•	manage sites (depending on role)
	•	manage users (owner/admin)

⸻

3. Client User (FUTURE)

Belongs to:
	•	one client
	•	indirectly to one agency

Capabilities:
	•	view own sites only
	•	limited interaction (status, preview, etc.)

Not implemented in V1.

⸻

USER CREATION MODEL

FORBIDDEN
	•	Direct DB insertion of users
	•	Creating users without membership
	•	Assigning users manually after creation
	•	Silent assignment to default agency

⸻

REQUIRED — INVITE FLOW

All agency users must be created via:

Invite Flow
	1.	Agency enters email
	2.	System creates invitation
	3.	User accepts invitation
	4.	Membership is created automatically

Result:

user → membership → agency


⸻

WHY INVITE FLOW
	•	avoids orphan users
	•	ensures correct tenant assignment
	•	scalable for real SaaS
	•	aligns with RBAC

⸻

AGENCY PROVISIONING MODEL

Who can create agency?

Only:
	•	superadmin

⸻

What must be created

When a new agency is created:
	1.	agency record
	2.	organization record
	3.	owner membership
	4.	billing account
	5.	cost center (agency level)
	6.	optional default client (only if consistent)

This must be:
	•	transactional
	•	idempotent
	•	non-manual

⸻

AGENCY WORKSPACE (NOT “PROFILE”)

The agency UI is:

/gnr8/agency

This is NOT a profile page.

This is a:

Agency Workspace

It contains:
	•	portfolio (sites)
	•	clients
	•	migration status
	•	cost/margin
	•	operations

⸻

CLIENT DIRECTORY (AGENCY VIEW)

Agency must have:

Client Directory

For each client:
	•	name
	•	number of sites
	•	cost
	•	revenue (simulated)
	•	margin

This is:
	•	required for agency workflow
	•	not optional

⸻

ACTIVE AGENCY MODEL

Current V1

?agency=<uuid>


⸻

RULES
	•	must be validated against membership
	•	invalid → fail closed
	•	missing (multi-membership) → fail closed
	•	no silent fallback

⸻

FUTURE (RECOMMENDED)

Move to:
	•	session-based active agency
OR
	•	user profile stored active agency

⸻

ACCESS CONTROL RULES

MUST ALWAYS APPLY

data must always be scoped by agency_id


⸻

NEVER ALLOWED
	•	cross-agency reads
	•	implicit agency selection
	•	default agency fallback
	•	trusting client-provided agency_id

⸻

FAIL-CLOSED PRINCIPLE

If anything is unclear:

deny access


⸻

ROLE-BASED ACCESS (V1)

owner
	•	full control
	•	manage users
	•	manage clients
	•	manage sites

admin
	•	operational control
	•	manage sites
	•	possibly manage clients

member
	•	read-only (or limited actions)

⸻

IMPORTANT DESIGN PRINCIPLES

1. Agency is the tenant boundary

Everything revolves around agency_id.

⸻

2. Users never attach directly to sites

Always go through membership.

⸻

3. No implicit behavior

Everything must be explicit.

⸻

4. Fail closed

Security > convenience

⸻

5. UI follows data model

Not the other way around.

⸻

FORBIDDEN PATTERNS

Creating user without membership

Assigning user after creation

Using default agency

Cross-agency joins without filter

Letting client choose arbitrary agency_id

⸻

CANONICAL FLOWS

Flow 1 — Create Agency

Superadmin:
→ create agency
→ system provisions everything

⸻

Flow 2 — Invite Agency User

Agency:
→ invite user
→ user accepts
→ membership created

⸻

Flow 3 — Agency Dashboard

User:
→ login
→ resolve membership
→ resolve agency
→ load read model

⸻

Flow 4 — (Future) Client Access

Client user:
→ login
→ see only own sites

⸻

THIS DOCUMENT IS AUTHORITATIVE

All future:
	•	features
	•	APIs
	•	UI
	•	Codex tasks

must follow this model.

Any deviation must be:
	•	explicitly justified
	•	reviewed
	•	documented

⸻
:::
⸻