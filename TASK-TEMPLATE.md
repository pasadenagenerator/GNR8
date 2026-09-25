# GNR8 Task Template

Use this template for new Codex tasks. Keep tasks small enough to complete in one session.

```text
TITLE:

GOAL:

BACKGROUND:
- Only include context needed for this task.

SCOPE:
- Allowed files or directories:
- Allowed behavior changes:

NON-GOALS:
- Explicitly out of scope:

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

VALIDATION:
- Run focused checks relevant to changed files.
- Run broad checks only for finalization, release, shared-contract changes, or explicit request.

REPORT BACK:
- Summary:
- Files changed:
- Validation run:
- Evidence:
- Behavior changed: yes/no
- Residual risks:
```
