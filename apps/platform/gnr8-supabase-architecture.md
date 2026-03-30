GNR8 — Supabase + Next.js Architecture Rules

PURPOSE

This document defines the ONLY allowed patterns for interacting with Supabase in the GNR8 platform.

These rules are strict and must be followed by all code (including AI-generated code).

Violating these rules leads to:
	•	production crashes
	•	data leaks
	•	connection exhaustion
	•	broken auth flows

⸻

CORE PRINCIPLES

1. Server Components are READ-ONLY

Server Components (Next.js App Router pages) must:
	•	read data
	•	never mutate cookies
	•	never perform side effects

FORBIDDEN
	•	cookies().set(…)
	•	Supabase client with setAll() in render
	•	auth session mutation
	•	DB connection pooling

ALLOWED
	•	read-only Supabase client
	•	stateless PostgREST queries
	•	in-memory transformations

⸻

2. Separate READ vs WRITE paths

Context	Allowed Operations
Server Component	READ ONLY
Server Action	READ + WRITE
Route Handler	READ + WRITE


⸻

3. NO raw pg in request/render path

FORBIDDEN
	•	pg Pool in Server Components
	•	pool.connect() in request lifecycle
	•	direct DATABASE_URL usage in pages

WHY

Serverless environments will:
	•	exhaust connection pools
	•	crash with MaxClientsInSessionMode

ALLOWED
	•	Supabase PostgREST (HTTP)
	•	service-role client (stateless)
	•	DB access via Supabase APIs

⸻

4. Two Supabase client modes ONLY

A. Read-only client (Server Component safe)

Used in:
	•	pages
	•	read models

Characteristics:
	•	uses cookies.getAll()
	•	setAll() = NO-OP
	•	cannot mutate session

⸻

B. Mutating client (Server Action / Route Handler)

Used in:
	•	login flows
	•	mutations
	•	auth refresh

Characteristics:
	•	cookies.set() allowed
	•	can update session

⸻

5. NEVER mix client modes

FORBIDDEN

Using mutating Supabase client inside:
	•	Server Component
	•	read model
	•	page render path

⸻

6. Read models are SINGLE ENTRY POINTS

All page data must go through:

read model → page

Rules:
	•	no per-row DB calls
	•	no service fan-out
	•	no nested queries
	•	all enrichment = in-memory

⸻

7. Multi-tenant safety (CRITICAL)

All data access must be scoped:

WHERE agency_id = current_agency_id

MUST:
	•	never trust client input
	•	always validate membership
	•	fail closed if invalid

⸻

8. RLS is the final authority

Even if app logic is correct:

DB must enforce isolation

Required:
	•	RLS on sites
	•	RLS on organizations
	•	RLS on memberships

⸻

9. No silent fallbacks

FORBIDDEN
	•	picking “first agency”
	•	defaulting to home agency
	•	ignoring missing membership

REQUIRED
	•	fail closed
	•	explicit selection required

⸻

10. No implicit global state

Everything must be explicit:
	•	agency_id
	•	user_id
	•	role

⸻

APPROVED DATA ACCESS PATTERNS

Pattern 1 — Page render

const data = await getReadModel()
return <Page data={data} />

✔ safe
✔ stateless
✔ scalable

⸻

Pattern 2 — Mutation

export async function POST() {
  const supabase = createMutatingClient()
  await supabase.from(...).insert(...)
}

✔ safe
✔ allowed to write cookies

⸻

Pattern 3 — Auth resolution

const { user, agency, role } = await resolveCurrentUserAgencyForPage()

✔ read-only
✔ fail-closed

⸻

FORBIDDEN PATTERNS

Using pg Pool in pages

const client = await pool.connect()

→ WILL break in production

⸻

Using Supabase with cookie writes in render

createServerClient({ cookies: { setAll } })

→ WILL crash Server Components

⸻

Per-row async calls

rows.map(async row => await fetch(...))

→ WILL cause connection pressure

⸻

MENTAL MODEL

Think of Supabase like:

Server Component → HTTP (stateless)
Server Action → DB (stateful)

NOT:

Everything → DB connection


⸻

FINAL RULE

If unsure:

choose stateless + read-only + fail-closed

NOT:
convenient + implicit + stateful

⸻

THIS DOCUMENT IS AUTHORITATIVE

All future code (human or AI) must follow these rules.

Any deviation must be:
	•	explicitly justified
	•	reviewed
	•	documented

⸻
:::
⸻