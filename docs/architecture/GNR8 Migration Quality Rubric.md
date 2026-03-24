# GNR8 Migration Quality Rubric

Status: CORE  
Owner: Gregor Žigon  
System Scope: Migration Engine + Runtime + Publish + AI Remediation  
Purpose: Define objective migration quality levels

---

# 1. Why This Document Exists

GNR8 aims to become:

> the best website migration engine in the world.

To achieve this, migration quality must be:

- measurable
- comparable
- automatable
- explainable
- enforceable in runtime decisions

This rubric defines:

- migration fidelity levels
- quality gates
- publish readiness thresholds
- AI remediation triggers
- shadow / canary eligibility

---

# 2. Migration Quality Dimensions

Migration fidelity is not one-dimensional.

GNR8 evaluates migration output across **five axes**:

1. Structural Fidelity  
2. Visual Fidelity  
3. Semantic Fidelity  
4. Functional Fidelity  
5. Asset Fidelity  

Each axis is scored independently.

Final migration level = weighted composite.

---

# 3. Structural Fidelity

Measures how accurately layout structure is reconstructed.

### Questions:

- Are sections correctly segmented?
- Is ordering preserved?
- Are major layout regions correct?
- Is hierarchy preserved?
- Are galleries/forms/nav isolated correctly?

### Levels

**Level S0 — Collapse**
- Entire page becomes single fallback block
- No section segmentation
- Layout unusable

**Level S1 — Weak segmentation**
- Sections exist but wrong boundaries
- Wrong grouping
- Layout rhythm broken

**Level S2 — Acceptable segmentation**
- Main sections exist
- Some grouping errors
- Layout rhythm partially preserved

**Level S3 — Strong reconstruction**
- Section ordering correct
- Hierarchy mostly correct
- Layout intent clear

**Level S4 — Near original**
- Section boundaries accurate
- Grouping correct
- Responsive intent inferred

**Level S5 — Structural clone**
- Layout graph matches original structure 1:1

---

# 4. Visual Fidelity

Measures how similar the rendered page is visually.

### Questions:

- Does the page look recognizably similar?
- Are hero proportions similar?
- Are galleries recognizable?
- Is visual density similar?
- Are typography scales similar?

### Levels

**V0 — Unrecognizable**
- Looks like generic fallback

**V1 — Rough scaffold**
- Content visible but layout alien

**V2 — Recognizable**
- Page identity recognizable
- Still visually crude

**V3 — Strong resemblance**
- Layout rhythm + hierarchy similar

**V4 — Near pixel intent**
- Strong resemblance across breakpoints

**V5 — Pixel-similar**
- Nearly indistinguishable

---

# 5. Semantic Fidelity

Measures correctness of meaning reconstruction.

### Questions:

- Is hero correctly identified?
- Are services correctly grouped?
- Is contact block accurate?
- Are legal/nav misclassifications avoided?
- Are CTAs recognized?

### Levels

**M0 — Semantic chaos**
- Sections mislabeled
- Contact appears as hero
- Nav becomes content

**M1 — Weak semantics**
- Some correct, many wrong

**M2 — Acceptable semantics**
- Major blocks correct
- Some confusion remains

**M3 — Strong semantics**
- Roles mostly correct
- Minor noise only

**M4 — High semantic accuracy**
- Business meaning preserved

**M5 — Intent reconstruction**
- AI-level understanding

---

# 6. Functional Fidelity

Measures preservation of interactive capability.

### Questions:

- Do links work?
- Are forms reconstructed?
- Are navigation anchors correct?
- Are maps/phones/mail links preserved?
- Are galleries interactive?

### Levels

**F0 — Broken**
- Links/forms nonfunctional

**F1 — Minimal**
- Some links work

**F2 — Basic**
- Navigation functional
- Forms missing

**F3 — Operational**
- Core interactions preserved

**F4 — Full parity**
- All interactions reconstructed

**F5 — Enhanced**
- Interaction improved vs original

---

# 7. Asset Fidelity

Measures correctness of media reconstruction.

### Questions:

- Are key images present?
- Are duplicates removed?
- Are logos correct?
- Are galleries complete?
- Are asset aliases resolved?

### Levels

**A0 — Asset loss**
- Missing key visuals

**A1 — Partial**
- Some images wrong/missing

**A2 — Acceptable**
- Key visuals present

**A3 — Strong**
- Galleries correct
- Dedupe working

**A4 — High**
- Correct variant selection

**A5 — Perfect**
- Asset identity fully reconstructed

---

# 8. Composite Migration Levels

Final migration level is composite:

| Level | Meaning |
|------|--------|
| L0 | Migration failed |
| L1 | Raw fallback migration |
| L2 | Shadow-only acceptable |
| L3 | Canary-ready |
| L4 | Production-ready |
| L5 | Migration showcase |

---

# 9. Publish Eligibility Rules

### Shadow Deployment

Minimum:
- S2
- V2
- M2
- A2
- F1

### Canary Deployment

Minimum:
- S3
- V3
- M3
- A3
- F2

### Full Production Cutover

Minimum:
- S4
- V3
- M4
- A4
- F3

---

# 10. AI Remediation Trigger Model

AI remediation activates when:

- Structural < S3
- Semantic < M3
- Visual < V3

AI tasks may include:

- layout reconstruction
- hero refinement
- gallery reconstruction
- content summarization
- section reclassification

---

# 11. Founder Operational Rule

GNR8 must not claim:

> “migration complete”

unless:

- page ≥ L3

GNR8 must not claim:

> “production migration success”

unless:

- page ≥ L4

---

# 12. Transporti Maver Current Assessment (Example)

Example snapshot (subject to change):

- Structural: S3
- Visual: V2.5
- Semantic: M2.5
- Functional: F1
- Asset: A3

Composite:
→ L2.5 (Shadow-grade, not Canary-ready)

This explains current recognizability gap.

---

# 13. Strategic Implication

This rubric enables:

- deterministic migration benchmarking
- product roadmap prioritization
- investor narrative clarity
- AI system training targets
- migration QA automation

---

# 14. Long-Term Vision

The best migration engine in the world must:

- measure itself objectively
- reject subjective success criteria
- define fidelity rigorously
- evolve thresholds over time

This rubric is the first formal step.