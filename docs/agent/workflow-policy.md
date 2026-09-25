# GNR8 Token-Budget Workflow Policy

## Collaboration Split

- ChatGPT: planning, research, architecture framing, task design, review, and context keeping.
- Codex: scoped execution, local verification, and concise completion reporting.
- Grega: product owner and final approval authority.

## Session Shape

- One task equals one Codex session.
- Keep each session focused on a single deliverable.
- Do not combine unrelated bug fixes, refactors, architecture, and documentation cleanup in one run.
- If scope grows, finish the current safe increment and propose a next task.
- For non-trivial tasks, start with the model/reasoning preflight from `model-routing.md`.

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
