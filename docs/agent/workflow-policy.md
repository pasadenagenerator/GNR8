# GNR8 Token-Budget Workflow Policy

## Collaboration Split

- ChatGPT: planning, research, architecture framing, task design, review, and context keeping.
- Codex: scoped execution, local verification, and concise completion reporting.
- Grega: product owner and final approval authority.

## Session Shape

- One task equals one Codex session.
- Keep each session focused on a single deliverable.
- Do not combine unrelated bug fixes, refactors, architecture, and documentation cleanup in one run.
- If scope grows, finish independent in-scope work and explain the exact boundary; do not automatically turn every blocker into another MVP task.
- For non-trivial tasks, start with the model/reasoning preflight from `model-routing.md`.

## Outcome-First Delivery

User agreement recorded 2026-10-02. Applies to planning and execution across GNR8 sessions.

- Plan one observable user outcome, the smallest necessary change, explicitly deferred work, and focused acceptance evidence. A working user step is the measure of progress, not code volume, test count, or MVP numbering.
- ChatGPT should resolve scope and architectural choices before handing off execution. Codex should implement the bounded task and fix routine local defects without repeated permission requests.
- Reuse existing code, contracts, artifacts, operation identities, and successful deployments. Verify relevant schema/API fields and target access early, before substantial implementation or expensive builds.
- Do not add a table, service, policy layer, authentication path, or infrastructure component unless already authorized or clearly necessary within the agreed scope. If it expands scope, explain why the existing system is insufficient and finish independent work before requesting a decision.
- After roughly 15 minutes without a concrete diagnosis or meaningful progress, report the exact blocker and stop speculative expansion. This is a decision checkpoint, not a promised completion time or a requirement to stop productive work.
- For stalled builds/uploads, inspect progress once at a reasonable interval. Do not silently wait through repeated long runs, start duplicate processes, or retry the same failing method without new evidence. Report interrupted checks honestly.
- Complete related local fixes before deploying where practical. Reuse the final Preview and minimize repeated deployments and user sign-ins. Reconcile ambiguous writes/deployments before retrying; do not recreate candidates blindly.
- Preserve authentication, target isolation, data integrity, existing customer serving, and required quality gates. Reducing scope means deferring unnecessary work, not bypassing safeguards.
- Carry existing authorization forward within its exact target and action scope. Do not ask again solely because a routine retry or continuation is needed.
- Keep optional features and broader platform hardening in a deferred list; do not move the completion criteria during execution. Close the agreed scope honestly, with unsupported capabilities stated separately.

## Decision Fidelity And Planning

User agreement refined 2026-10-15. Applies to ChatGPT planning and Codex execution.

- ChatGPT tasks must state the user outcome, exact accepted values, preserved behavior, permitted removals, authorization boundaries, and acceptance evidence. Detail should remove ambiguity, not prescribe speculative architecture or repeat project history.
- Keep a short current decision checklist in the task context or existing handoff, not a new policy subsystem. Latest explicit user instructions override conflicting older notes, UI defaults, fixtures, and tests. A test asserting an old value is not evidence of user approval. Ask only when the latest decision itself is ambiguous.
- Before a hosted action, compare its actual inputs with that checklist. Do not submit a known conflicting value and fix it after execution. Never log secrets as input evidence.
- ChatGPT must distinguish user-reported outcomes from independently verified results and must not respond to every failure with a new MVP or another blanket retry authorization. A recurring failure class calls for a consolidated diagnosis and changed approach.
- Technical integrity, route coverage, visual fidelity, user acceptance, merge, and publication are separate claims. Do not describe missing behavior as an accepted limitation unless the user explicitly accepted it.

## Integration Loop Control

- For cross-module defects, trace one representative retained input through the actual producer, transformation, storage, and consumer. Identify the authoritative identities and reference mappings before adding another helper or special case.
- Reuse one authoritative asset/reference resolver where practical. Do not infer identity independently from filenames, URL extensions, or newly guessed paths when verified manifest mappings exist. Preserve ownership and integrity checks; simplify conflicting representations, not safeguards.
- Diagnose the complete affected dependency chain before deploying a narrow patch. Prefer replaying retained failing inputs through the actual Worker entry point locally with hosted I/O replaced at existing boundaries. Do not create a parallel proof framework. If local replay is impossible, explain the exact limitation before a hosted diagnostic run.
- After a hosted failure, retain a sanitized reproducer and identify what evidence distinguishes the next attempt. Preserve sensitive payloads only in authorized locations, outside commits and logs. Do not recapture to debug a downstream transformation defect.
- After two consecutive hosted failures in the same contract/dependency class, pause further hosted attempts and consolidate the local reproduction and repair. Renaming the error, creating a new action ID, or progressing to the next URL does not reset this checkpoint. Resume only with evidence that the affected chain passes, or an explicit user-approved bounded hosted diagnostic plan.
- Consolidate related fixes before deploying. Verify the actual application bundle includes the changed module, especially across Platform/Worker imports; a successful build or intended source SHA alone is insufficient when packaging is in question.
- Do not create derived-from-derived captures merely to evade a stale idempotency result. First identify the immutable input and transformation revision, then use the existing versioning contract to represent a genuinely changed result. Preserve the meaning of retries and reconcile partial writes.
- Routine in-scope corrections remain authorized, but this does not permit unlimited deploy/Generate cycles. Report cumulative hosted attempts and whether the failure class changed at the checkpoint. Do not repeatedly call each retry the single or final attempt.

## Token Budget

- Tiny: documentation typo, small copy edit, or isolated config tweak. Budget target: minimal search, no broad tests.
- Small: isolated implementation or focused doc update. Budget target: local files plus focused validation.
- Medium: feature slice, shared helper, or contract adjustment. Budget target: relevant docs, nearby tests, and one broader check if needed.
- Large: architecture, migrations, cross-app behavior, release readiness, or public contract work. Budget target: split into smaller tasks unless a milestone requires one session.

## Repository Exploration

- Start with targeted `rg` and exact file reads.
- Prefer nearby code and tests over repo-wide scans.
- Cap command output; rerun narrower searches when output is too broad.
- Summarize logs; do not paste long compiler or test output unless a failure detail is necessary.

## Tools And MCP

- Use the minimum tool set needed for the task.
- Prefer local repo files and purpose-built tools before broad web or MCP access.
- Use external/network tools only when the task requires current external facts or connected services.
- Do not enable or call provider tools for DNS, registrars, production deploys, billing, or live execution unless explicitly authorized.

## Subagents

Default: off.

Allowed only when all are true:
- The task has independent, parallel workstreams.
- Each workstream has a narrow context package.
- The expected context savings are larger than coordination overhead.
- The main agent can verify and integrate the result.

Do not use subagents for simple repo search, routine implementation, or tasks requiring one coherent design judgment.

## Handoff

- Use `docs/agent/completion-report.md`.
- Include changed files, focused validation, behavior-change status, and residual risks.
- Keep the report short enough for ChatGPT to review without reopening the full thread.
