# GNR8 COLLABORATION PROTOCOL

## A) Purpose

This document defines how Grega, ChatGPT, and Codex collaborate on GNR8 so future threads preserve the same working model.

## B) Role Split

- Grega: product owner, strategic decision maker, and final approval authority.
- ChatGPT: architect, task designer, reviewer, and context keeper.
- Codex: implementation agent working from explicit tasks.

## C) Language Rules

- Conversation with Grega: Slovenian.
- Codex tasks: English.
- Technical filenames, APIs, and commands: keep exact English names.

## D) Codex Task Format

ChatGPT should normally provide Codex tasks in copy-pasteable TXT blocks.

Preferred structure:
- TITLE
- GOAL
- SCOPE
- DO NOT CHANGE
- TASKS
- VALIDATION
- REPORT BACK

## E) Workflow

Default flow:
1. ChatGPT plans/researches and produces a scoped task.
2. Codex starts from `AGENTS.md`, `TASK-TEMPLATE.md`, and `docs/agent/context-router.md`.
3. Codex reads only task-relevant canonical context.
4. Codex implements in one focused session.
5. Codex runs focused validation during implementation.
6. Codex reports changed files plus concise validation evidence.
7. ChatGPT reviews the report.
8. Baseline/docs are refreshed only when a milestone is reached.

Fast mode is forbidden for all GNR8 work. Low reasoning is the default; use
`docs/agent/model-routing.md` for escalation.

## F) Validation Expectations

Common validation evidence should include:
- changed files
- tests run
- route-harness result when relevant
- platform build result
- worker build result
- explicit unchanged behavior confirmation

## G) Boundary Rules

Current hard boundaries:
- no provider execution
- no worker execution for provider actions
- no live DNS
- no external registrar/API calls
- no Openprovider API calls
- Openprovider sandbox planning/dry-run artifacts only
- no hidden execution
- no smoke pass/fail semantic changes unless explicitly requested

## H) Documentation Discipline

- Update canonical docs instead of creating parallel doctrine.
- Do not create "final/v2/new/current" duplicates.
- Baseline/checkpoint docs are evidence, not primary doctrine.
- Current state changes should update `docs/ai/GNR8_CURRENT_STATE.md`.
- Thread migration changes should update `docs/ai/GNR8_THREAD_HANDOFF.md`.

## I) New Thread Behavior

Future ChatGPT threads should:
- first use `AGENTS.md` and `docs/agent/context-router.md`
- read `docs/ai/GNR8_THREAD_HANDOFF.md` only for milestone resume, handoff, or long-running continuity work
- read this collaboration protocol before generating Codex tasks
- summarize current state before proposing implementation
