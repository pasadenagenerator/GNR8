# GNR8 Generated-Output Publication Eligibility Policy

Policy version: `gnr8-generated-output-eligibility:v1`

## Decision

Verified generated Astro output has its own publication-eligibility path. It is
not assigned production confidence by the imported-site migration scorer, and
Astro labels or successful-build booleans are never sufficient to dispatch or
allow publication.

The generated path is selected only when the retained runtime artifact has a
complete, supported Astro candidate manifest, candidate-record envelope,
promotion record, exact candidate/artifact ownership, supported adapter and
materialization versions, and a valid runtime bundle hash. An incomplete,
unknown, caller-labelled, or mixed provenance envelope fails closed. Artifacts
without generated markers continue through the unchanged source-migration
governance path.

## Required technical evidence

Technical `PASS` requires all of the following for one exact candidate and
artifact:

- a valid retained `gnr8-astro-persisted-preview-candidate:v2` record;
- authoritative runtime-site, site-version, ownership-site, organization, and
  agency ownership equal to the candidate and artifact identities;
- supported candidate kind, adapter, conversion, export-manifest, renderer,
  asset-mode, producer, and materialization versions;
- server-established `gnr8-generated-output-build-evidence:v1`, including the
  build-proof version, producer identity, source/export hashes, candidate
  content/storage hashes, output paths, and asset-fingerprint-map hash;
- a valid artifact bundle hash and byte equality between the retained candidate
  and runtime artifact;
- the existing candidate validator's HTML/CSS safety rules (no scripts,
  executable attributes, forms, refresh navigation, linked resources, or
  unsupported CSS/resource dependencies);
- the existing render-integrity gate for required canonical content payloads,
  structure, and asset fingerprints;
- an independently trusted
  `gnr8-generated-output-content-manifest:v1`, hash-bound to required content,
  navigation, assets, output paths, supported publish stages, and explicit
  unsupported capabilities;
- every required navigation target present, local anchors resolvable, local
  routes within supported output paths, and external URLs explicitly declared;
- the exact bounded canonical route inventory and artifact-size limit enforced
  by the production candidate contract.

Missing build evidence blocks. The evaluator does not infer build success from
an adapter label, export hash alone, or the presence of rendered HTML.

## Review and activation separation

Technical eligibility, review approval, target readiness, and activation are
separate states.

An explicit `gnr8-generated-output-review:v1` decision must be `APPROVED` and
must match the policy version, artifact id, artifact bundle hash, candidate id,
candidate content hash, content-manifest hash, and technical-evaluation hash.
Missing, rejected, corrupt, or stale review evidence blocks publication. A
conversation, build result, technical pass, lifecycle label, or previous review
of different bytes is not a review record.

Even an approved review returns only
`READY_FOR_TARGET_READINESS`. The existing publish candidate, target, pointer,
approval/gate, concurrency, and safety controls remain responsible for target
readiness and final activation. Any content, ownership, version, stage, or hash
change requires a new technical evaluation and review.

## Publishing integration

`publishApprovedSiteVersion(...)` invokes the generated-output guard before
artifact refresh, target-readiness evaluation, and pointer mutation. A trusted
server resolver must supply the retained candidate, build evidence, content
manifest, authoritative ownership, and review record. No configured resolver
means generated publication is blocked.

The guard rechecks artifact id, bundle hash, candidate hashes, policy version,
review status, scope, and publish stage. It rechecks the artifact binding after
the existing preparation step so an intervening content change blocks before
pointer mutation. Imported artifacts continue to call
`evaluatePublishEnforcement(...)` with the existing migration scores and
thresholds.

The Astro successor workflow may move a new candidate to
`READY_FOR_REVIEW`, but it no longer transitions that candidate to `APPROVED`
from its own technical checks. Approval must come from an auditable external
review record and normal lifecycle operation.

## Normal generated-site delivery scope

The content manifest is produced from the captured runtime artifact and is
specific to each generation. Every captured static route must be present in the
Astro export, required local navigation must resolve inside that route set, and
every referenced owned image/font/style asset must retain its stored SHA-256
identity. Genuinely external HTTPS, mail, and telephone targets remain external.

Executable scripts, forms, embedded application state, checkout, inventory,
accounts, and platform-theme runtimes are unsupported capabilities. A request
that requires any of them fails explicitly before candidate registration; it
does not fall back to legacy HTML. The legacy `html-static-artifact` adapter is
available only by explicit selection or by preserving an existing artifact's
adapter during regeneration.

Source workspace files, source hashes, build receipt, export hashes, route
inventory, asset fingerprints, exact candidate bytes, and review identity are
retained at the existing artifact boundary. Technical validation moves a
candidate only to `READY_FOR_REVIEW`; a separate exact-artifact approval is
required before the normal publish action may activate it on the internal
shadow runtime.
