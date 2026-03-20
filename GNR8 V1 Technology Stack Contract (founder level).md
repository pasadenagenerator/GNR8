GNR8 V1 Technology Stack Contract (founder level)

1. Purpose

This document defines the canonical V1 technology stack of GNR8.

It exists to:
- lock the implementation foundation of the system
- prevent unnecessary stack drift
- preserve startup velocity
- give developers, AI agents, and future operators a clear technical boundary

This is not a vendor comparison document.
This is a system constraint document.

2. Core Principle

GNR8 V1 uses a deliberately minimal, modern, AI-native stack.

The stack must optimize for:
- execution speed
- architectural clarity
- multi-tenant SaaS reliability
- deterministic workflows
- AI-assisted system evolution

The stack must NOT optimize for:
- theoretical hyperscale
- infra novelty
- premature platform abstraction
- enterprise theater

3. Canonical V1 Stack

The canonical GNR8 V1 stack is:

- GitHub
- Vercel + AI Gateway
- Supabase
- Inngest
- Stripe Billing
- Resend

Any addition outside this stack requires explicit justification.

4. Role of Each Layer

4.1 GitHub

GitHub is the source of truth for:
- code
- architecture specs
- implementation history
- task execution context
- change review

In GNR8, GitHub is not just code storage.
It is a system memory layer.

4.2 Vercel

Vercel is the canonical application runtime and delivery platform for V1.

Vercel is used for:
- web application hosting
- preview environments
- public site delivery
- edge/static serving
- deployment orchestration

Vercel is the runtime shell of GNR8 V1.

4.3 AI Gateway

AI Gateway is the canonical model access layer.

It is used for:
- model routing abstraction
- future provider flexibility
- observability and governance
- reducing direct vendor coupling

GNR8 should avoid hard-wiring business logic directly to one model provider whenever reasonably possible.

4.4 Supabase

Supabase is the canonical system state layer.

Supabase is used for:
- authentication
- multi-tenant data storage
- canonical page/site model storage
- asset/storage layer
- relational truth of the platform

Supabase is the operational database and storage substrate of GNR8 V1.

4.5 Inngest

Inngest is the canonical asynchronous workflow and lifecycle layer.

It is used for:
- migration jobs
- validation jobs
- publish jobs
- AI processing workflows
- delayed or background tasks
- lifecycle orchestration

Routes must not become background workflow engines.
Async lifecycle belongs in Inngest.

4.6 Stripe Billing

Stripe is the canonical billing and subscription truth layer.

It is used for:
- subscriptions
- usage billing
- entitlements
- future agency/client billing flows
- monetization logic

Billing truth should not be duplicated elsewhere.

4.7 Resend

Resend is the canonical transactional communication layer.

It is used for:
- operator notifications
- approval notifications
- onboarding flows
- billing notifications
- system lifecycle messages

Email is a core operator system primitive, not an afterthought.

5. System Boundary Model

The V1 stack implies the following system boundary model:

- Model Layer = Supabase
- Runtime Layer = Vercel
- Intelligence Access Layer = AI Gateway
- Workflow Layer = Inngest
- Billing Layer = Stripe
- Communication Layer = Resend
- Code / Spec Memory Layer = GitHub

This is the canonical technical shape of GNR8 V1.

6. What This Stack Says About GNR8

This stack reflects a very specific product philosophy:

GNR8 is:
- an orchestration platform
- an intelligence platform
- a structured runtime platform
- an agency SaaS platform

GNR8 is not:
- a custom infra company
- a self-hosting platform
- a Kubernetes product
- a microservices-first system
- a builder-runtime-centric system

7. Anti-Complexity Rule

GNR8 V1 must resist adding:
- event buses
- custom workflow engines
- extra internal services
- infra abstraction layers
- custom hosting control planes
- unnecessary backend frameworks
- premature multi-cloud strategy

The stack is intentionally small.

The burden of proof is always on adding complexity, not on preserving simplicity.

8. AI-Native Interpretation

This stack is intentionally compatible with an AI-assisted development and runtime philosophy.

It supports:
- structured state
- async processing
- model routing
- deployable previews
- auditable workflows
- deterministic publish lifecycle

This is important because GNR8 is not just “using AI.”
GNR8 is being built as an AI-legible and AI-operable system.

9. Evolution Policy

The V1 stack may evolve only when one of these is true:
- current tool no longer supports core product direction
- a clear bottleneck exists in production reality
- migration/runtime/AI workflows require a higher-order capability
- operational or economic constraints force change

Stack changes must be:
- explicit
- documented
- justified in architecture language
- reviewed against the V1 Runtime Architecture Spec

10. Non-Goals for V1 Stack

The V1 stack does not aim to solve:
- arbitrary plugin ecosystems
- custom infra ownership
- advanced distributed systems
- real-time collaborative editing at large scale
- generalized event-driven architecture
- autonomous AI operations at deep scale

Those are future concerns, if ever needed.

11. Founder Directive

The GNR8 V1 stack is a strategic constraint, not a temporary convenience.

It exists to preserve:
- speed
- clarity
- operability
- AI compatibility
- product convergence

Any technical decision that weakens those properties should be treated as suspect by default.