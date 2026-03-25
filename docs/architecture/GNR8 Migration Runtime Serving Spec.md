# GNR8 Migration Runtime Serving Spec

Status: DRAFT  
Owner: GNR8 Core Architecture  
Scope: Request-time serving of migration artifacts  

Depends On:
- GNR8 Artifact Builder Spec
- GNR8 Migration Governance Spec
- GNR8 Runtime Engine Spec

---

## 1. Purpose

Migration Runtime Serving defines how migrated artifacts are:

- resolved
- validated
- served
- audited

This layer handles:

Request → Artifact → Response

It does NOT:

- generate layout
- execute migration reconstruction
- run optimization
- mutate canonical model

It delivers:

Migration truth.

---

## 2. Runtime Serving Philosophy

Migration runtime must behave like:

Static hosting  
+ Governance awareness  
+ Explainability hooks  

Runtime must never reinterpret migration output.

---

## 3. Serving Modes

RuntimeMode =
  SHADOW
  CANARY
  PRODUCTION
  PREVIEW

Mode determines:

- visibility
- enforcement strictness
- telemetry exposure

---

## 4. Request Resolution Pipeline

1. Resolve host binding  
2. Resolve active site pointer  
3. Resolve artifact  
4. Resolve path  
5. Validate governance enforcement  
6. Deliver artifact output  
7. Emit diagnostics  

---

## 5. Host Binding Model

HostBinding:
  bindingKind (shadow | canonical | preview)
  status
  siteId
  artifactPointer

Host binding must be:

- deterministic
- auditable
- reversible

---

## 6. Artifact Resolution

Runtime must:

- resolve active artifact pointer
- validate artifact integrity
- confirm path coverage
- validate rollout policy

Runtime must not:

- auto-repair artifact
- auto-trigger migration
- auto-generate fallback structure

---

## 7. Path Resolution Model

ArtifactPathMap:
  path → documentRef

Rules:

- exact canonical path matching
- normalized trailing slash
- deterministic fallback only

---

## 8. Asset Serving

Runtime must:

- resolve canonical asset graph
- enforce MIME correctness
- allow deterministic migration fallback
- emit asset diagnostics

Runtime must never:

- invent asset transformations
- proxy arbitrary external content

---

## 9. Governance Enforcement

Runtime serving must enforce:

- migration gate states
- rollout policy states
- staged enforcement rules

Serving decision must be:

- deterministic
- logged
- explainable

---

## 10. Runtime Diagnostics

Every response must produce:

RuntimeServeDiagnostics:
  artifactResolutionStatus
  enforcementDecision
  fallbackUsage
  hostBindingRef
  integritySignals

---

## 11. Public vs Internal Runtime

Public runtime:
- minimal diagnostics
- hardened

Internal runtime:
- verbose diagnostics
- compare evidence
- operator visibility

---

## 12. Failure Philosophy

Runtime must fail:

- loudly
- deterministically
- explainably

Forbidden:

- silent fallback
- mixed artifact state
- runtime mutation

---

## 13. Founder Directive

Migration runtime must:

never invent  
never beautify  
never reinterpret  

Only:

serve canonical truth.