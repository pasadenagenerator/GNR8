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
1. Read canonical context.
2. Do discovery if needed.
3. Propose scoped Codex task.
4. Codex implements.
5. Codex reports changed files plus validation evidence.
6. ChatGPT reviews report.
7. Baseline/docs are refreshed when a milestone is reached.

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
- first read `docs/ai/GNR8_THREAD_HANDOFF.md`
- follow canonical read order
- read this collaboration protocol before generating Codex tasks
- summarize current state before proposing implementation
