# Business Discovery Runtime Integration Plan

## Phase WU-6 Boundary

WU-6 defines the future production integration strategy for using Source
Website Understanding as the canonical upstream input for Business Discovery.

This document is planning and governance only. It introduces no runtime
switching, feature flags, Business Discovery builder changes, adapter changes,
Website Understanding changes, persistence, schema, API, UI, worker, AI,
generation, publishing, deployment, DNS, or production mutation.

The future integration must preserve one invariant:

```text
Business Discovery builder behavior remains unchanged.
Only the upstream input boundary changes.
```

The future production mode is selected by runtime configuration. WU-6 does not
add that configuration and does not activate any mode.

## Executive Answer

Website Understanding can become the canonical Business Discovery input by
making the Source Website Understanding Projection the only upstream adapter
input to the existing Business Discovery builder. The adapter remains the
boundary between source-site understanding and the current Business Discovery
input shape. Business Discovery itself stays deterministic and unchanged.

Rollout is safe only if production progresses through explicit modes:

```text
LEGACY
-> SHADOW_COMPARE
-> WEBSITE_UNDERSTANDING
```

Rollback is instant because WEBSITE_UNDERSTANDING mode must retain the current
legacy scattered input assembly as a runtime fallback path. Rollback changes
only runtime configuration. It must never require data migration, artifact
migration, database repair, recomputation, rebuild, or downstream artifact
repair.

Legacy and WU coexist during migration because SHADOW_COMPARE keeps current
Business Discovery canonical while building WU-based Business Discovery only
in memory for comparison and diagnostics. Nothing from shadow execution is
persisted and nothing downstream changes.

Determinism is preserved by requiring stable projection rebuilds, stable
adapter mapping, stable Business Discovery builder inputs, deterministic
comparison, and fail-closed diagnostics before any WEBSITE_UNDERSTANDING
activation.

Connectors remain unaffected because WordPress, Joomla, Webflow, Shopify,
Ecwid, Mono, and future connectors stay upstream of the Source Website
Understanding Projection. The projection is connector-neutral. Business
Discovery consumes source understanding, not connector-specific logic.

## Existing Evidence

WU-0 concluded that GNR8 already has a distributed source-site understanding
chain across Import, Evidence Capture, semantic import, asset inventory,
Candidate Discovery, Candidate Review, Reconstruction Package, StructurePlan,
and Business Discovery input handling.

WU-1 defined the Source Website Understanding Projection as a deterministic,
connector-neutral, evidence-backed, read-only projection over existing
source-site artifacts, with pure runtime projection and no dedicated
persistence.

WU-2 implemented that projection as a pure runtime read model. It remains
source-site only, fail-closed, rebuilt on demand, and not persisted as a new
artifact.

WU-3 proved Business Discovery input equivalence and identified missing
`sourceSiteId` plus verbatim Evidence Capture limitations as blockers.

WU-4 closed those input gaps and proved the non-persistent shadow path, but
blocked cutover on lost `content_theme_observed` section-boundary refs.

WU-5 closed the section-lineage blocker. ODV and ViroiDoc both reached 100%
current Business Discovery dependency coverage with 0 missing content-theme
refs, 0 added content-theme refs, unchanged `MEDIUM` confidence, deterministic
rebuild equality, source-traceable added projection diagnostics, and no
writes.

WU-6 uses that evidence to define the future cutover strategy. It does not
execute that strategy.

## Integration Principles

- Business Discovery builder remains unchanged.
- Source Website Understanding remains source-site only.
- The adapter is the only upstream boundary between WU and Business Discovery.
- Current scattered input assembly remains available for rollback until legacy
  retirement.
- Shadow Business Discovery is in-memory only.
- Shadow comparison never writes Business Discovery, DBT, BUR, Business
  Alignment, WDB, WGP, provider payload, generated proposal, OWM, compliance,
  approval, publish, or evolution artifacts.
- Runtime configuration may choose a future mode; WU-6 adds no flags or
  switching code.
- Cutover is blocked by any lost finding, lost evidence ref, confidence
  inflation, unsupported business meaning, lineage regression, downstream
  contamination, nondeterministic rebuild, connector-specific behavior, or
  missing required diagnostics.

## Runtime Modes

### LEGACY

Business Discovery uses the current scattered input assembly. Website
Understanding is not involved in Business Discovery execution. The shadow path
is disabled and no comparison runs.

| Dimension | Policy |
| --- | --- |
| ownership | Business Discovery owns input assembly from current upstream sources. |
| authority | Current persisted Business Discovery output is canonical. |
| persistence | Current Business Discovery persistence behavior only. No WU shadow artifact. |
| comparison | None. |
| rollback | Already in rollback state. No action beyond keeping LEGACY selected. |
| diagnostics | Current Business Discovery diagnostics only. |
| operator visibility | Existing Business Discovery and Business Foundation surfaces only. WU may remain separately inspectable but has no Business Discovery authority. |

Expected runtime response:

```text
Current scattered input assembly
-> Existing Business Discovery builder
-> Current Business Discovery artifact
-> DBT and downstream chain
```

### SHADOW_COMPARE

Current Business Discovery remains canonical. Website Understanding builds a
shadow input through the adapter. Shadow Business Discovery executes in memory
only. Automatic comparison runs and produces diagnostics. Nothing is
persisted, no latest pointer changes, and no downstream artifact changes.

| Dimension | Policy |
| --- | --- |
| ownership | Business Discovery owns canonical output; WU owns projection; adapter owns translation; comparator owns migration diagnostics. |
| authority | Current persisted Business Discovery remains canonical. Shadow output has no authority. |
| persistence | No shadow Business Discovery persistence. No projection persistence. Comparison diagnostics are runtime-only unless a later explicit telemetry phase is approved. |
| comparison | Required. Current vs WU-shadow comparison classifies equivalence, expected normalization, supported improvements, missing, regression, conflicting, unexpected, and nondeterministic results. |
| rollback | Change future runtime configuration back to LEGACY. No data repair. |
| diagnostics | Required for coverage, lineage, confidence, limitations, unsupported findings, deterministic rebuild, comparison timeout, and downstream contamination. |
| operator visibility | Operators may see mode, readiness, and failure categories in future diagnostics surfaces, but SHADOW_COMPARE cannot expose controls that mutate artifacts. |

Expected runtime response:

```text
Current scattered input assembly
-> Existing Business Discovery builder
-> Canonical Business Discovery artifact

Source Website Understanding Projection
-> WU adapter
-> Existing Business Discovery builder
-> In-memory shadow Business Discovery
-> Comparison
-> Runtime diagnostics
```

### WEBSITE_UNDERSTANDING

Website Understanding becomes the Business Discovery input. The adapter maps
the Source Website Understanding Projection into the existing Business
Discovery builder input shape. The current scattered input assembly remains
available only as rollback. Business Discovery builder behavior and downstream
architecture remain unchanged.

| Dimension | Policy |
| --- | --- |
| ownership | WU owns source-site projection; adapter owns Business Discovery input translation; Business Discovery owns interpretation and artifact production. |
| authority | WU-derived Business Discovery output is canonical for enabled scope. Legacy assembly has rollback authority only. |
| persistence | Normal Business Discovery persistence only. No projection persistence is introduced by cutover. |
| comparison | Optional after activation for continued assurance, but it cannot block already-completed persisted artifacts unless a later governance phase defines that behavior. Pre-activation comparison is mandatory. |
| rollback | Change future runtime configuration to LEGACY or SHADOW_COMPARE. No artifact migration, DB repair, recomputation, rebuild, or downstream repair. |
| diagnostics | Required before and during activation: mode, projection readiness, dependency coverage, lineage status, confidence status, limitations, connector identity, deterministic rebuild status, and rollback state. |
| operator visibility | Operators must be able to see that Business Discovery input authority is WU, whether gates are passing, and whether rollback is available. Operators must not need to edit data to recover. |

Expected runtime response:

```text
Source Website Understanding Projection
-> WU adapter
-> Existing Business Discovery builder
-> Canonical Business Discovery artifact
-> DBT
```

## Mode Authority Matrix

| Mode | Canonical input | Shadow execution | Writes allowed | Downstream impact | Rollback path |
| --- | --- | --- | --- | --- | --- |
| LEGACY | Current scattered assembly | No | Current Business Discovery behavior only | Current chain | Already legacy |
| SHADOW_COMPARE | Current scattered assembly | Yes, in memory only | No shadow writes | None | Runtime configuration to LEGACY |
| WEBSITE_UNDERSTANDING | Source Website Understanding via adapter | Optional diagnostics only | Normal Business Discovery writes only | Normal DBT and downstream chain from Business Discovery | Runtime configuration to LEGACY or SHADOW_COMPARE |

## Readiness Model

WEBSITE_UNDERSTANDING mode may not be enabled until every requirement below is
true for the intended activation scope.

| Requirement | Mandatory rule |
| --- | --- |
| 100% dependency coverage | Every current Business Discovery input dependency has a WU source or an explicitly equivalent WU omission rule. No partial or missing current dependency is allowed. |
| deterministic rebuild | Rebuilding the same projection and adapter input from the same source artifacts produces identical normalized content and identity. |
| no lost findings | Every current Business Discovery finding is present in WU-shadow output, semantically equivalent, or stronger with source-backed evidence. |
| no lost evidence refs | Every current finding evidence ref required for meaning and lineage is preserved, including section-boundary refs. |
| no lost limitations | Current limitations are preserved or represented by source-traceable equivalent limitations. |
| no confidence inflation | WU-shadow confidence may not increase unless stronger evidence and governance rules justify it. Unsupported increases block activation. |
| no unsupported business meaning | WU-shadow may not introduce offerings, audience, trust, brand, geography, goals, or differentiators as business findings unless current governed Business Discovery rules support them. |
| no lineage regression | Source site, site version, dry run, import, Evidence Capture, Candidate Discovery, Candidate Review, Reconstruction, and StructurePlan lineage must not weaken or disappear. |
| no downstream contamination | WU and adapter inputs must reject DBT, BUR, Business Alignment, WDB, WGP, provider payloads, generated proposals, OWM, compliance, improvement, evolution, publish, and DNS state. |
| connector neutrality | Projection and adapter behavior must not branch on WordPress, Joomla, Webflow, Shopify, Ecwid, Mono, or future connector implementation details. |
| diagnostics complete | Coverage, lineage, confidence, limitation, comparison, deterministic rebuild, and connector-neutrality diagnostics are available for the activation scope. |
| ODV validated | ODV passes the full SHADOW_COMPARE gate for the current production target artifact set. |
| ViroiDoc validated | ViroiDoc passes the full SHADOW_COMPARE gate for the current production target artifact set. |

`ready_with_expected_differences` is not enough by itself for production
default activation. It means migration can proceed to limited activation
planning only when all expected differences are enumerated, source-traceable,
non-contradictory, and operator-visible.

## Mandatory Safety Gates

### Coverage Gate

Blocks activation unless WU covers every current Business Discovery input
dependency for the activation scope.

### Lineage Gate

Blocks activation on missing source site identity, site version identity, dry
run identity, source URL, source artifact refs, evidence refs, Candidate
Discovery refs, Candidate Review refs, Reconstruction refs, or StructurePlan
context refs that current Business Discovery depends on.

### Comparison Gate

Blocks activation on missing findings, conflicting findings, unsupported added
findings, lost evidence refs, lost limitations, status regression, domain
regression, comparison timeout, or nondeterministic comparison.

### Confidence Gate

Blocks activation on confidence inflation, confidence mismatch without a
documented source-backed reason, or weaker confidence that would change
downstream trust semantics without governance approval.

### Diagnostics Gate

Blocks activation if operators cannot tell which mode ran, which projection
was used, which adapter path ran, which dependencies were covered, why
differences exist, and whether rollback is available.

### Limitations Gate

Blocks activation if current upstream limitations are lost, collapsed into
untraceable summaries, duplicated semantically, or converted into unsupported
business conclusions.

### Connector Compatibility Gate

Blocks activation if adapter behavior depends on connector-specific
structures instead of connector-neutral projection fields.

### Deterministic Rebuild Gate

Blocks activation if projection rebuild, adapter input rebuild, or shadow
Business Discovery rebuild changes normalized content from the same source
artifacts.

### Downstream Contamination Gate

Blocks activation if WU or adapter input includes downstream artifacts,
generated-site observations, provider output, compliance output, approval
state, publish state, or evolution history.

## Rollout Policy

The future production cutover must happen in ordered stages. WU-6 does not
execute any stage.

### Stage 1: Legacy Only

Production remains in LEGACY. WU is inspectable as a separate read model only.
Business Discovery canonical output comes from current scattered assembly.

Exit criteria:

- WU-5 evidence remains current for the selected targets.
- Operators understand that no runtime switch has occurred.

### Stage 2: Legacy Plus Shadow Compare

Production moves selected internal execution into SHADOW_COMPARE. Current
Business Discovery remains canonical. WU-shadow output is in-memory only and
comparison diagnostics are observed.

Exit criteria:

- No shadow writes.
- No downstream changes.
- Repeated deterministic rebuild equality.
- No lost findings, refs, limitations, or confidence regressions.

### Stage 3: Limited Internal Websites

SHADOW_COMPARE expands to a small internal website set representing common
source shapes. Failures block activation and remain diagnostics only.

Exit criteria:

- 100% dependency coverage across internal set.
- No unsupported business meaning.
- Connector-neutral behavior confirmed where connector-shaped inputs exist.

### Stage 4: Selected Migration Customers

Selected customer websites run under tightly monitored migration rules.
WEBSITE_UNDERSTANDING may be enabled only for explicitly approved migration
scope after all gates pass. Legacy fallback remains immediate.

Exit criteria:

- Rollback drills succeed by runtime configuration only.
- Operators can explain every expected difference.
- No downstream contamination or customer-visible semantic regression.

### Stage 5: Website Understanding Default

WEBSITE_UNDERSTANDING becomes the default Business Discovery input for
eligible scopes. LEGACY remains configured as instant rollback.

Exit criteria:

- Sustained equivalence and safety metrics.
- No unresolved connector compatibility issues.
- No unresolved confidence or lineage regressions.

### Stage 6: Legacy Retired

Legacy scattered input assembly is retired only after a separate explicit
retirement phase. Retirement is not part of WU-6 and must require its own
governance, validation, and rollback analysis.

## Rollback Policy

Rollback from WEBSITE_UNDERSTANDING must require only runtime configuration.

Rollback must never require:

- data migration;
- artifact migration;
- database repair;
- recomputation;
- rebuild;
- Business Discovery artifact edits;
- DBT/BUR/Business Alignment/WDB/WGP repair;
- provider payload repair;
- generated proposal repair;
- OWM/compliance/report repair;
- publish or DNS repair.

Rollback response:

```text
Set mode to LEGACY or SHADOW_COMPARE
-> Next Business Discovery execution uses legacy input assembly
-> Existing persisted artifacts remain immutable historical records
-> Downstream chain continues from whichever Business Discovery artifacts are explicitly selected by normal governance
```

Rollback is valid even if WU projection is unavailable, stale, invalid, or
failing comparison, because legacy assembly remains independent until legacy
retirement.

## Legacy And WU Coexistence

During migration:

- LEGACY owns canonical Business Discovery output.
- WU owns source understanding projection.
- SHADOW_COMPARE creates a non-authoritative in-memory WU-shadow Business
  Discovery artifact.
- Comparator produces runtime diagnostics only.
- Downstream artifacts consume the canonical Business Discovery artifact, not
  the shadow artifact.
- Differences are migration evidence, not business conclusions.

Coexistence ends only after Stage 6 legacy retirement, which requires a future
explicit phase.

## Determinism Preservation

Determinism is preserved through these rules:

- Projection input artifact refs are explicit and stable.
- Projection normalized content excludes volatile inspection timestamps from
  identity comparison.
- Adapter mapping is pure and derived only from projection fields.
- Missing source identity fails closed.
- Section-boundary refs are preserved exactly where they carry current
  Business Discovery meaning.
- Limitations are deduped deterministically without erasing semantic lineage.
- Business Discovery builder remains the same deterministic builder.
- Comparison sorts and normalizes expected projection differences.
- Shadow output is never used as persisted truth unless WEBSITE_UNDERSTANDING
  mode is explicitly enabled for that scope.

## Connector Strategy

Connectors remain upstream of Source Website Understanding. They may import,
fetch, crawl, map, or normalize source-site data into the existing evidence
chain, but they do not own Business Discovery semantics.

| Connector | Compatibility rule |
| --- | --- |
| WordPress | WordPress-specific import details must be normalized before WU. Business Discovery consumes connector-neutral WU fields only. |
| Joomla | Joomla source structure must appear as source URL, routes, navigation, pages, sections, assets, limitations, and diagnostics. Adapter logic must not branch on Joomla. |
| Webflow | Webflow collection or design details stay upstream evidence. WU exposes only source observations and candidates. |
| Shopify | Commerce signals may appear as source candidates only until governed Business Discovery or DBT rules consume them. Adapter cannot infer unsupported business meaning from Shopify identity. |
| Ecwid | Embedded commerce evidence remains source-site evidence or candidates. No connector-specific Business Discovery path is introduced. |
| Mono | Mono-specific source acquisition remains upstream. WU stays the connector-neutral boundary. |
| Future connectors | New connectors must project into the same WU contract instead of adding Business Discovery-specific branches. |

Connector compatibility gate:

```text
Connector output
-> Import / Evidence / Candidate chain
-> Source Website Understanding Projection
-> Adapter
-> Business Discovery
```

No connector may bypass WU to provide special Business Discovery inputs after
WEBSITE_UNDERSTANDING mode is enabled.

## Governance Model

| Area | Owner | Rule |
| --- | --- | --- |
| Source acquisition | Connector/import layer | Produce source evidence, limitations, and diagnostics. |
| Source understanding | WU projection | Reconcile existing source artifacts into connector-neutral, evidence-backed source understanding. |
| Translation boundary | WU -> Business Discovery adapter | Map WU into current Business Discovery builder input without adding meaning. |
| Business interpretation | Business Discovery builder | Produce conservative Business Discovery findings using existing rules. |
| Migration assurance | Comparator/readiness gates | Prove equivalence, lineage, confidence, and deterministic safety. |
| Downstream governance | DBT and later artifacts | Consume canonical Business Discovery only through existing artifact lineage. |
| Cutover authority | Architecture/runtime governance | Approve scope, mode, gates, and rollback readiness before activation. |
| Operator response | Operations | Observe diagnostics, initiate rollback by configuration, and avoid data repair. |

No layer is allowed to promote source candidates into canonical business truth
without the existing Business Discovery/DBT governance chain.

## Observability Plan

Future observability is documentation-only in WU-6. No telemetry is
implemented here.

Required future metrics:

- shadow equivalence rate;
- runtime mode distribution;
- rollback count;
- rollback time;
- comparison failures;
- lineage failures;
- coverage failures;
- confidence mismatches;
- unsupported added findings;
- lost evidence refs;
- lost limitations;
- deterministic rebuild failures;
- comparison timeout count;
- projection unavailable count;
- partial projection count;
- connector compatibility failures;
- downstream contamination rejections.

Required future dimensions:

- siteVersionId;
- connector family where known;
- mode;
- projection readiness;
- Business Discovery artifact status;
- comparison readiness;
- activation scope;
- rollback availability;
- failure category.

Observability must not store shadow Business Discovery as canonical truth and
must not mutate downstream artifacts.

## Failure Scenarios

| Scenario | Expected runtime response |
| --- | --- |
| projection unavailable | LEGACY continues. SHADOW_COMPARE emits projection-unavailable diagnostics. WEBSITE_UNDERSTANDING blocks or rolls back to LEGACY by configuration. |
| shadow mismatch | Current Business Discovery remains canonical. Comparison marks mismatch and blocks cutover for that scope. |
| lineage regression | Cutover blocked. Diagnostics identify missing or weaker lineage. WEBSITE_UNDERSTANDING must roll back if already active for the affected scope. |
| confidence regression | Cutover blocked unless governance accepts the lower confidence. Downstream trust semantics must not silently change. |
| confidence inflation | Cutover blocked. Unsupported increases are treated as unsafe even when findings look better. |
| connector inconsistency | Connector-specific path is rejected. Connector must normalize upstream into WU contract fields. |
| unexpected business finding | Shadow output is non-authoritative. Cutover blocked until the finding is either supported by existing Business Discovery rules or removed from adapter influence. |
| comparison timeout | Current Business Discovery remains canonical. Timeout blocks cutover and records diagnostic failure. |
| partial projection | LEGACY continues. SHADOW_COMPARE marks coverage/readiness failure. WEBSITE_UNDERSTANDING cannot activate for that scope. |
| downstream contamination | Projection or adapter input is rejected. Cutover blocked and contamination source is diagnosed. |
| lost evidence ref | Cutover blocked. Evidence lineage must be repaired before activation. |
| lost limitation | Cutover blocked unless an equivalent source-traceable limitation is proven. |
| deterministic rebuild mismatch | Cutover blocked. No shadow or WU output can become authoritative. |
| rollback requested | Runtime configuration returns execution to LEGACY or SHADOW_COMPARE. No data changes are required. |

## Runtime Sequence Diagrams

### LEGACY To Business Discovery

```text
Operator / runtime configuration
-> Select LEGACY
-> Current scattered input assembly
-> Existing Business Discovery builder
-> Persist canonical Business Discovery artifact
-> DBT and downstream artifacts continue normally
```

### SHADOW_COMPARE To Business Discovery To Comparison To Diagnostics

```text
Operator / runtime configuration
-> Select SHADOW_COMPARE
-> Current scattered input assembly
-> Existing Business Discovery builder
-> Persist canonical Business Discovery artifact

Source Website Understanding Projection
-> WU adapter
-> Existing Business Discovery builder
-> In-memory shadow Business Discovery artifact
-> Automatic comparison
-> Runtime diagnostics
-> No persistence
-> No downstream change
```

### WEBSITE_UNDERSTANDING To Adapter To Business Discovery To DBT

```text
Operator / runtime configuration
-> Select WEBSITE_UNDERSTANDING for approved scope
-> Source Website Understanding Projection
-> WU adapter
-> Existing Business Discovery builder
-> Persist canonical Business Discovery artifact
-> DBT
-> Business Understanding Report
-> Business Alignment
-> Website Design Brief
-> Website Generation Package
```

### Instant Rollback

```text
Operator / runtime configuration
-> Select LEGACY or SHADOW_COMPARE
-> Current scattered input assembly is used on next Business Discovery run
-> Existing artifacts remain immutable
-> No migration
-> No repair
-> No recomputation
```

## Future Activation Sequence

WU-6 does not activate this sequence. A future implementation phase must treat
each step as an explicit checkpoint.

1. Confirm WU-6 plan remains current against production code.
2. Confirm WU-5 ODV and ViroiDoc evidence remains valid or rerun equivalent
   read-only validation.
3. Implement runtime mode selection in a future approved phase without using
   production feature flags as an accidental rollout mechanism.
4. Enable LEGACY explicitly as the initial configured mode.
5. Enable SHADOW_COMPARE for internal scope only.
6. Observe equivalence, lineage, confidence, coverage, connector, and
   deterministic rebuild metrics.
7. Expand SHADOW_COMPARE to limited internal websites.
8. Run rollback drills that require runtime configuration only.
9. Enable WEBSITE_UNDERSTANDING for selected migration customers only after
   all gates pass.
10. Keep LEGACY rollback configured and tested.
11. Promote WEBSITE_UNDERSTANDING to default only after sustained clean
    metrics and governance approval.
12. Retire LEGACY only in a later explicit phase with its own validation and
    rollback plan.

## Remaining Blockers Before Activation

- No runtime configuration mechanism exists yet for these modes.
- No production telemetry exists yet for the observability metrics listed
  above.
- No operator surface exists yet for future integration-mode diagnostics.
- WU-6 has not validated additional connector-shaped real targets beyond the
  existing ODV and ViroiDoc evidence.
- Legacy retirement has no plan and must remain out of scope until after
  WEBSITE_UNDERSTANDING has proven stable as default.

## WU-6 Conclusion

The complete migration strategy is:

```text
Keep Business Discovery unchanged.
Use Website Understanding as the future canonical upstream input boundary.
Introduce only runtime modes in a later approved implementation phase.
Use SHADOW_COMPARE to prove equivalence without writes.
Enable WEBSITE_UNDERSTANDING only after mandatory safety gates pass.
Rollback instantly by runtime configuration.
Retire legacy only in a later explicit phase.
```

No production behavior changes in WU-6.
