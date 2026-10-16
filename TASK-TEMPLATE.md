# GNR8 Task Template

Use this template for new Codex tasks. Keep tasks small enough to complete in one session.

```text
TITLE:

GOAL:
- One observable user outcome and its completion criterion.

BACKGROUND:
- Only include context needed for this task.

SCOPE:
- Allowed files or directories:
- Allowed behavior changes:

NON-GOALS:
- Explicitly out of scope:

ACCEPTANCE DECISIONS:
- Exact current user-approved values and behavior:
- Permitted removals/limitations; everything else must be preserved:
- Separate candidate acceptance, merge, and publication authority:

CONSTRAINTS:
- Fast mode is forbidden.
- Preserve existing product behavior unless explicitly listed in SCOPE.
- Preserve product invariants, test coverage, and quality gates.
- No provider execution, live DNS, external registrar/API calls, hidden runtime execution, or production mutation unless explicitly authorized.

MODEL / REASONING:
- Before execution, recommend ChatGPT planning and Codex execution settings.
- Default: Low reasoning.
- Escalate only if the task matches docs/agent/model-routing.md.
- If the UI cannot select the ideal low-cost setting, use the lowest available safe setting.

CONTEXT TO READ:
- Start with docs/agent/context-router.md.
- Add only the project docs required by the touched area.

IMPLEMENTATION:
- Make the smallest complete change that satisfies GOAL.
- Avoid speculative refactors and parallel doctrine.
- Verify relevant contracts and required target access before expensive implementation/build steps.
- Apply the Outcome-First Delivery decision checkpoint; do not expand scope to resolve unrelated blockers.
- For integration work, name the retained representative input, authoritative identity/reference mapping, and existing local replay path. Follow the two-failure hosted checkpoint; do not invent a new harness by default.

VALIDATION:
- Run focused checks relevant to changed files.
- Run broad checks only for finalization, release, shared-contract changes, or explicit request.
- Name the smallest sufficient acceptance evidence for the user outcome; reuse valid prior results unless changes or failures invalidate them.
- Verify actual action inputs against current decisions. For imported pages, check rendered fidelity as well as file/link coverage.

REPORT BACK:
- Summary:
- Files changed:
- Validation run:
- Evidence:
- Behavior changed: yes/no
- Residual risks:
```
