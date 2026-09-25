# GNR8 Model And Reasoning Routing

## Defaults

- Fast mode is forbidden.
- Low reasoning is the default for GNR8 Codex execution.
- Use the least expensive model that can reliably complete the task.
- Prefer escalation inside a new clearly scoped task over letting one session sprawl.
- Model/reasoning recommendations are advisory. The user may need to change the UI setting manually; do not assume Codex can override it.

## Routing Preflight

Before non-trivial GNR8 work, give a lightweight preflight before execution:
- Recommend ChatGPT planning/research model and reasoning.
- Recommend Codex execution model and reasoning.
- Say whether the current UI setting appears sufficient, too expensive, or too weak.
- Say whether the task should stay in one session or be split.

Keep this to 1-3 lines for tiny/small tasks. For obvious tiny edits, proceed with the current setting and mention only if it is clearly wasteful or insufficient.

Current known floor for Grega's package:
- `GPT-5.5 Medium` is the lowest selectable UI setting.
- Treat it as the practical low-cost default unless the UI later exposes Luna/Sol Low or other lower-cost settings.
- Still recommend lower settings conceptually when useful, but state that the current package may not expose them.

## Stay On Low For

- Documentation edits.
- Small UI or copy changes.
- Localized bug fixes with nearby tests.
- Test additions for an already understood module.
- Mechanical refactors with clear boundaries.

## Escalate To Medium For

- Shared-contract changes.
- Cross-module behavior.
- Failing tests where root cause is not local after focused investigation.
- Security, billing, auth, tenancy, or data-integrity sensitive changes.
- Ambiguous tasks that still have enough context to proceed safely.

## Escalate To High Or Above Only For

- Architecture decisions with long-term platform impact.
- Migrations or schema changes affecting production data.
- Release finalization with broad quality gates.
- Complex debugging across app, worker, database, and runtime boundaries.

## Escalation Discipline

- Name the reason for escalation.
- Narrow the context before escalating.
- Do not use higher reasoning to compensate for vague scope.
