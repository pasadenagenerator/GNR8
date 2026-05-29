GNR8 Technical Architecture

Introduction

GNR8 is an AI-native Website Operating System built around a governance-first architecture.

The platform is designed to manage the complete lifecycle of websites, commerce systems, provider ecosystems, and future AI-assisted operations through a unified operational model.

Unlike traditional website platforms, GNR8 intentionally separates understanding from execution.

This separation is the foundation of the entire architecture.

⸻

Core Architectural Principle

The most important architectural decision in GNR8 is:

Governance precedes execution.

Before any action can be performed, the platform must first understand:

* what exists
* who owns it
* which providers are involved
* what permissions apply
* what environment is affected
* what governance rules apply
* what execution boundaries exist

The system therefore evolves through a staged architecture:

1. Visibility
2. Understanding
3. Governance
4. Evaluation
5. Approval
6. Execution

Execution is the final step, not the first.

⸻

Architectural Layers

The platform is organized into distinct operational layers.

Experience Layer

User-facing interfaces.

Examples:

* Agency Dashboard
* Provider Fleet Cockpit
* Openprovider Cockpit
* Migration Interfaces
* Future Operations Dashboards

Responsibilities:

* visualization
* governance surfaces
* readiness indicators
* operational visibility
* approvals

No direct infrastructure execution occurs here.

⸻

Control Plane

The Control Plane maintains operational understanding.

Responsibilities:

* provider registry
* provider governance
* environment awareness
* credential governance
* AI routing policies
* readiness evaluation
* orchestration planning
* operational state

The Control Plane answers:

“What should happen?”

It does not directly perform actions.

⸻

Execution Plane

The Execution Plane performs governed actions.

Future responsibilities:

* provider mutations
* deployments
* DNS changes
* content publication
* infrastructure operations
* AI-assisted execution

The Execution Plane answers:

“Perform the approved action.”

Execution is intentionally constrained until governance maturity is achieved.

⸻

Website Lifecycle Architecture

GNR8 treats websites as operational systems rather than projects.

Current lifecycle model:

Import
  ↓
Structure Preparation
  ↓
Layout Preparation
  ↓
Preview Generation
  ↓
Approval
  ↓
Execution
  ↓
Continuous Operation
  ↓
Continuous Optimization
  ↓
Continuous Evolution

Every stage produces structured artifacts that remain traceable throughout the lifecycle.

The platform preserves operational understanding from import through long-term management.

⸻

Deterministic Foundation

GNR8 is intentionally deterministic before becoming autonomous.

Current architecture prioritizes:

* reproducibility
* traceability
* explainability
* auditability

Examples:

* deterministic migration pipeline
* deterministic provider contracts
* deterministic routing policies
* deterministic routing evaluator
* deterministic readiness modeling

Future autonomous systems are expected to operate on top of these deterministic foundations.

⸻

Provider Fleet Architecture

Provider Fleet is the governance layer for all external systems.

Every external dependency is represented as a provider contract.

Current categories include:

* Registrar Providers
* Deployment Providers
* Edge Infrastructure Providers
* Commerce Providers
* Communication Providers
* ERP Providers
* Execution Providers
* Source Control Providers
* AI Providers
* Storage Providers
* Identity Providers

Examples:

* Openprovider
* Vercel
* Cloudflare
* Stripe
* Resend
* GitHub
* OpenAI
* Supabase
* Pantheon

⸻

Provider Contract Model

Every provider is represented through a canonical contract.

Core attributes include:

providerId
displayName
providerCategory
environmentScope
bindingScope
capabilities
readiness
boundaries
credentialBoundary
advisor
links

This abstraction allows all providers to participate in a unified governance model.

⸻

Provider Governance

Provider Governance is responsible for understanding provider state before execution becomes possible.

Each provider maintains:

Capabilities

What the provider can do.

Examples:

domains
dns
availability
deployments
edge_compute
model_metadata
routing_policy
email_delivery
transactional_email
accounting
invoicing

⸻

Readiness

Operational maturity.

Examples:

sandbox_verified
production_verified
not_configured
control_plane_only
execution_enabled

⸻

Boundaries

Operational restrictions.

Examples:

read_only
mutation_allowed
approval_required
execution_blocked

⸻

Environment Awareness

Environment awareness enables future multi-environment governance.

Supported scopes:

global
sandbox
preview
staging
production

Current implementation focuses on visibility and governance.

Execution remains environment-aware but execution-blocked.

⸻

Credential Architecture

Credentials are treated as governed resources.

The architecture separates:

Credential Reference
Credential Binding
Secret Resolution
Provider Authorization
Execution

Current platform state:

Credential Boundary Preview
Configured Reference Modeling
Secret Resolution Disabled
Execution Blocked

This separation is critical for future multi-tenant operation.

⸻

Multi-Tenant Architecture

Future provider relationships may exist at multiple levels.

Supported binding scopes:

global
agency
project
environment

Examples:

Global OpenAI account
Agency-specific Stripe account
Project-specific GitHub repository
Environment-specific deployment target

The architecture is designed to support all four simultaneously.

⸻

AI Routing Architecture

GNR8 is designed as a multi-model AI platform.

The objective is orchestration rather than vendor dependence.

Current provider metadata includes:

* model families
* strengths
* routing hints
* latency classes
* cost classes
* context window classes

Examples:

OpenAI
Anthropic
Gemini
Groq
Mistral

⸻

AI Routing Policy Layer

The policy layer maps task classes to preferred providers.

Examples:

Site Migration Planning
→ OpenAI
Long Architecture Review
→ Anthropic
Layout Understanding
→ Gemini
Fast Interactive Generation
→ Groq
EU-sensitive Workloads
→ Mistral

Current routing policies are deterministic and registry-driven.

⸻

AI Routing Evaluator

The evaluator consumes:

taskType
inputModality
outputModality
latencyPreference
costPreference
contextRequirement
regionPreference

And produces:

selectedProviderId
selectedModelFamily
routingStrategy
fallbackProviderIds
constraintsApplied
executionAllowed
executionBlocked

Current state:

Preview Only
Execution Blocked
No Model Calls
No Provider Dispatch

The evaluator exists to validate routing logic before live execution becomes possible.

⸻

Governance Layer

Governance is a first-class architectural component.

Current governance domains:

* Provider Governance
* Credential Governance
* Environment Governance
* AI Routing Governance
* Execution Governance

Future governance domains:

* Cost Governance
* Compliance Governance
* Tenant Governance
* Autonomous Execution Governance

All execution systems must pass through governance layers.

⸻

Operational Visibility Architecture

The platform exposes operational state through governance surfaces.

Examples:

* Operational Snapshot
* Provider Category Summary
* Environment Awareness Preview
* Credential Boundary Preview
* Provider Readiness Advisors
* AI Routing Readiness Advisor
* AI Routing Evaluator Preview

These surfaces allow operators to understand system state without requiring execution access.

⸻

Current Implementation State

Implemented:

* deterministic migration architecture
* provider contract registry
* provider taxonomy
* provider fleet cockpit
* provider governance model
* AI routing architecture
* routing policy registry
* routing evaluator preview
* environment awareness preview
* credential boundary preview
* readiness advisors

Partially Implemented:

* execution planning architecture
* provider orchestration architecture
* approval models

Not Yet Enabled:

* provider execution
* credential resolution
* AI model execution
* automated provider mutations
* autonomous operations

⸻

Long-Term Direction

The long-term objective is not simply to automate website management.

The objective is to create a governed operational system capable of understanding, maintaining, improving, and evolving digital experiences across provider ecosystems.

The architecture intentionally prioritizes:

* governance
* explainability
* auditability
* traceability
* safety

before introducing autonomy.

This foundation enables the future evolution of GNR8 into a true Website Operating System capable of orchestrating websites, providers, AI systems, and digital operations through a unified governance-first architecture.

Po mojem imaš zdaj prvič v projektu komplet:

1. GNR8_FOUNDER_VISION.md → zakaj obstajamo.
2. GNR8_AGENCY_VALUE_PROPOSITION.md → zakaj bi nas uporabljale agencije.
3. GNR8_PLATFORM_OVERVIEW.md → kaj platforma je.
4. GNR8_TECHNICAL_ARCHITECTURE.md → kako je platforma zgrajena.
