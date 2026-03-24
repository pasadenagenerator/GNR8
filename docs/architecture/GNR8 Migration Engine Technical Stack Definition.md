# GNR8 Migration Engine Technical Stack Definition

Status: CORE  
Owner: Gregor Žigon  
Scope: Migration Engine subsystem map  
Priority: Highest implementation relevance

---

## 1. Purpose

This document defines the minimum necessary technical stack of the GNR8 Migration Engine.

It answers:

- what subsystems the migration engine consists of
- what each subsystem is responsible for
- what is core vs optional
- what must exist before GNR8 can claim best-in-class migration capability

This is not a vendor list.
This is a system-definition document.

---

## 2. Core Principle

The GNR8 Migration Engine is not one tool.

It is a coordinated stack of deterministic subsystems that turn an existing website into:

- canonical reconstruction graphs
- runtime-safe publishable artifacts
- AI-ready editable structure

The stack must remain:

- deterministic
- inspectable
- testable
- builder-independent
- runtime-first

---

## 3. Minimum Required Migration Stack

The minimum required stack consists of 8 subsystems:

1. Intake Layer
2. Snapshot Layer
3. Structural Reconstruction Layer
4. Semantic Reconstruction Layer
5. Canonical Modeling Layer
6. Asset Resolution Layer
7. Artifact Build Layer
8. Runtime Verification Layer

Anything beyond this is optional for now.

---

## 4. Intake Layer

### Purpose
Normalize migration inputs into one deterministic entry flow.

### Inputs
- public URL
- multi-page site root
- uploaded HTML bundle
- future CMS export
- future builder export

### Responsibilities
- resolve migration entrypoint
- determine crawl scope
- detect platform hints
- assign migration job identity
- record source metadata
- choose import mode

### Required outputs
- migration job id
- source type
- source URL/root
- intake config
- initial crawl target set

### Notes
This layer must be simple and reliable.
It must not perform deep interpretation.

---

## 5. Snapshot Layer

### Purpose
Produce an immutable, reproducible source snapshot.

### Responsibilities
- fetch HTML
- fetch linked assets
- materialize referenced resources
- normalize source paths
- preserve crawl graph
- assign snapshot identity
- store source evidence for later reconstruction

### Required outputs
- snapshot id
- source HTML files
- asset inventory
- crawl map
- normalized resource references
- evidence map

### Notes
This is where URL Import + Preview Operator work already provides strong value.
This subsystem is already partially proven.

---

## 6. Structural Reconstruction Layer

### Purpose
Convert source snapshot into a deterministic layout graph.

### Responsibilities
- detect section boundaries
- detect header/footer/nav regions
- detect hero blocks
- detect galleries and media clusters
- detect forms
- detect layout groups and containers
- infer ordering and hierarchy
- preserve structural rhythm

### Required outputs
- layout graph
- region labels
- structural confidence
- unresolved structural anomalies

### Notes
This is currently the most strategically important subsystem for GNR8.
If this layer is weak, migration becomes AI summarization instead of deterministic reconstruction.

---

## 7. Semantic Reconstruction Layer

### Purpose
Assign meaning to reconstructed layout without breaking structure.

### Responsibilities
- classify hero/about/services/contact/gallery/legal blocks
- detect business identity signals
- detect CTA intent
- distinguish nav/legal/utility noise from content
- classify content density and block purpose
- support multilingual grouping where possible

### Required outputs
- semantic graph
- semantic roles
- confidence scores
- ambiguity annotations

### Notes
Semantic reconstruction must enrich, not replace, the structural layer.

---

## 8. Canonical Modeling Layer

### Purpose
Map reconstructed data into the GNR8 Canonical Layout Model (CLM).

### Responsibilities
- convert layout graph into CLM layout nodes
- convert semantic graph into semantic nodes
- normalize content graph
- attach style tokens
- attach asset graph
- attach navigation graph
- preserve source evidence

### Required outputs
- canonical page graph set
- page version payload
- migration fidelity metadata
- explainability links

### Notes
This is the core contract layer between migration and runtime.

---

## 9. Asset Resolution Layer

### Purpose
Turn source media references into stable runtime-usable assets.

### Responsibilities
- dedupe equivalent assets
- resolve alias paths
- group asset variants
- assign canonical asset identity
- determine render-preferred image variant
- preserve fallback paths where needed
- detect broken or missing assets

### Required outputs
- asset graph
- canonical asset keys
- asset alias groups
- preferred render variants
- missing/broken asset diagnostics

### Notes
This layer is now strategically important because real shadow serving already proved asset path errors can break migration credibility.

---

## 10. Artifact Build Layer

### Purpose
Project CLM into a deterministic runtime artifact.

### Responsibilities
- transform CLM into publishable HTML
- bind content
- bind assets
- apply style bridge / style token output
- create runtime metadata
- create path map
- create publish artifact identity

### Required outputs
- artifact id
- HTML by path
- asset path references
- manifest
- renderer compatibility metadata

### Notes
This is the layer that makes migration output real.
Without this, GNR8 is just an analyzer.

---

## 11. Runtime Verification Layer

### Purpose
Prove that migrated output is safe and real before and after publish.

### Responsibilities
- artifact coverage audit
- active pointer checks
- host binding checks
- route/path existence checks
- public ingress smoke
- fallback observability
- publish safety checks

### Required outputs
- readiness report
- shadow eligibility
- canary eligibility
- runtime diagnostics
- rollback confidence

### Notes
This layer converts migration from “code output” into “deployable system.”

---

## 12. Optional but Not Yet Core Subsystems

These may exist later, but are not mandatory in the minimal migration stack:

### 12.1 AI Remediation Layer
Fixes output after deterministic migration.

### 12.2 Visual Diff Layer
Compares source vs artifact visually.

### 12.3 Multi-channel Export Layer
Exports to other targets beyond runtime artifact.

### 12.4 Domain Onboarding Layer
Handles custom-domain automation.

### 12.5 Human Review UI Layer
Advanced operator workflows beyond current tools.

These are important later, but not required for core migration engine identity.

---

## 13. Current GNR8 Stack Status

### Strong / already meaningful
- Snapshot Layer
- Artifact Build Layer
- Runtime Verification Layer
- partial Asset Resolution Layer

### Partially mature
- Intake Layer
- Semantic Reconstruction Layer
- Canonical Modeling Layer

### Main current weakness / highest leverage
- Structural Reconstruction Layer

This is why current migration output still risks becoming summary-like instead of structure-faithful.

---

## 14. Strategic Priority Order

The migration stack must be improved in this order:

1. Structural Reconstruction Layer
2. Asset Resolution Layer
3. Semantic Reconstruction Layer
4. Artifact Build Layer visual quality
5. AI Remediation Layer

This order is mandatory.

If GNR8 improves AI before structure, it will become:
- a smart summarizer
not
- the best migration engine in the world

---

## 15. Technical Stack Rule

GNR8 migration quality will not come from one magic model.

It will come from:

- deterministic subsystem quality
- canonical modeling discipline
- runtime verification rigor
- narrow, controlled AI assistance

The engine must remain understandable as a stack of responsibilities.

---

## 16. Founder Directive

The GNR8 Migration Engine must be built like infrastructure, not like a demo.

Its minimum technical stack must remain:

- explicit
- versioned
- measurable
- explainable
- production-servable

If this stack is strong, GNR8 becomes migration infrastructure for the AI era.
If this stack is weak, GNR8 becomes just another AI website toy.