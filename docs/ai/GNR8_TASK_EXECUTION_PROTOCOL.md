# GNR8 TASK EXECUTION PROTOCOL

## 1) Purpose

Ta dokument definira obvezen nacin podajanja in izvajanja nalog, da ostane razvoj deterministicen, sledljiv in brez arhitekturnega drifta.

## 2) Mandatory Rules

- Task mora biti podan v TXT bloku.
- Deterministic language only.
- No speculative refactors.
- No architecture redesign brez ADR.
- Vsaka sprememba mora imeti dokaz uspeha.
- Brez silent fallbackov.
- Brez implicitnih sprememb contractov.
- Brez skritega runtime/provider execution.

## 3) Required Task Template (Copy/Paste)

TXT TASK START
Title:
Context:
Goal:
Non-Goals:
Scope (Allowed Files):
Out of Scope:
Constraints:
Implementation Requirements:
Diagnostics Requirements:
Validation Commands:
Expected Evidence:
Success Criteria:
TXT TASK END

## 4) Required Constraints For Current Phase

V tej fazi so obvezne meje:
- NO provider execution.
- NO live DNS.
- NO external registrar calls.
- NO worker execution for provider actions.
- Openprovider sandbox planning/dry-run artifacts only. No provider execution is permitted, including sandbox execution. Control-plane metadata and deterministic planning only.

## 5) Output Contract for Codex

Po izvedbi mora biti vrnjen:
1. Summary of changes
2. Files changed (exact list)
3. Diagnostics added/updated
4. Validation commands run
5. Validation evidence
6. Residual risks / follow-ups

## 6) Quality Gate Checklist

Pred zakljuckom mora task potrditi:
- [ ] Scope spostovan
- [ ] Contracts ohranjeni
- [ ] Diagnostics dodani/posodobljeni
- [ ] Validation ukazi izvedeni
- [ ] Evidence prilozen
- [ ] Ni silent fallbackov
- [ ] Ni architecture drift-a
- [ ] Current execution boundaries niso krsene

## 7) Canonical Context Requirement

Use progressive disclosure.

Start with:
- `AGENTS.md`
- `TASK-TEMPLATE.md`
- `docs/agent/context-router.md`

Then read only the canonical docs required by the task area. Do not preload
`GNR8_THREAD_HANDOFF`, `GNR8_MASTER_CONTEXT_BOOTSTRAP`, `GNR8_PROJECT_MAP`,
`GNR8_CANONICAL_DOC_INDEX`, or every ADR for small/local tasks.

Pred vecjimi spremembami preberi samo relevantne canonical docs:
- `docs/ai/GNR8_THREAD_HANDOFF.md` for fresh long-running threads, milestone resume, or handoff.
- `docs/ai/GNR8_CURRENT_STATE.md` for current milestone state or direction changes.
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md` when locating the authoritative doc for a touched area.
- `docs/ai/decisions/*.md` only for architecture, contract, execution-boundary, or governance changes.

## 8) Escalation Rule

Ce task zahteva arhitekturno spremembo ali live/provider execution premik:
- STOP izvedba
- predlagaj ADR
- nadaljuj sele po potrditvi odlocitve

For collaboration roles, language rules, and Grega ↔ ChatGPT ↔ Codex workflow, see `docs/ai/GNR8_COLLABORATION_PROTOCOL.md`.
