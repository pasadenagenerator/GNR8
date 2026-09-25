# GNR8 Agent Router

This file is intentionally small. Read only the on-demand docs that match the task.

## Hard Rules

- Fast mode is forbidden for all GNR8 work.
- One task equals one Codex session. Keep each session scoped and finishable.
- Default to Low reasoning. Escalate only when the task meets `docs/agent/model-routing.md`.
- Before non-trivial work, give a lightweight model/reasoning preflight for ChatGPT planning and Codex execution.
- Subagents are off by default. Use them only when `docs/agent/workflow-policy.md` allows it.
- Preserve product behavior, public contracts, data integrity, tests, and quality gates unless the task explicitly authorizes a change.
- Do not perform provider execution, live DNS, external registrar/API calls, hidden runtime execution, or production mutation unless explicitly authorized by the task and current project policy.

## Start Here

1. Read `TASK-TEMPLATE.md` when shaping or checking a task.
2. Read `docs/agent/context-router.md` to choose the minimum project docs needed.
3. Read `docs/agent/workflow-policy.md` for token-budget, exploration, tools, subagent, and handoff rules.
4. Read `docs/agent/validation-policy.md` before running tests or checks.
5. Use `docs/agent/completion-report.md` for the final report.

## Local Baseline

- Prefer targeted search over broad repository scans.
- Prefer focused tests while implementing.
- Run full `make check` or broad builds only at milestone/finalization points, or when the task explicitly asks.
- Keep tool output short. Summarize evidence instead of pasting long logs.
