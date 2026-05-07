# GNR8 TASK EXECUTION PROTOCOL

## 1) Purpose
Ta dokument definira obvezen nacin podajanja in izvajanja nalog, da ostane razvoj deterministcen, sledljiv in brez arhitekturnega drifta.

## 2) Mandatory Rules
- Task mora biti podan v TXT bloku.
- Uporabi deterministic language only.
- No speculative refactors.
- No architecture redesign brez ADR.
- Vse spremembe morajo imeti dokaz uspeha.
- Brez silent fallbackov.
- Brez implicitnih sprememb contractov.

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

## 4) Field Definition Standard
- Title: kratek, enolicen naslov naloge.
- Context: trenutno stanje in zakaj naloga obstaja.
- Goal: tocno kaj mora biti dosezeno.
- Non-Goals: kaj ni del naloge.
- Scope (Allowed Files): ekspliciten seznam dovoljenih datotek/modulov.
- Out of Scope: cesa se ne sme spreminjati.
- Constraints: pravila (deterministic, contracts, no drift).
- Implementation Requirements: konkretna implementacijska pravila.
- Diagnostics Requirements: katere diagnosticne evente dodati/spremeniti.
- Validation Commands: tocni ukazi za preverjanje.
- Expected Evidence: kaj mora biti vidno v outputu/logih.
- Success Criteria: merljiv zakljucek naloge.

## 5) Output Contract for Codex
Po izvedbi mora biti vrnjen:
1. Summary of changes
2. Files changed (exact list)
3. Diagnostics added/updated
4. Validation commands run
5. Validation evidence
6. Residual risks / follow-ups

## 6) Allowed vs Disallowed
Allowed:
- deterministcne izboljsave znotraj obstojecih arhitekturnih meja
- eksplicitno dodajanje diagnostike
- contract-preserving refactors

Disallowed:
- arhitekturni pivot brez ADR
- nejasni "cleanup" posegi brez success criteria
- fallback logika brez diagnosticnega zapisa
- spremembe izven declared scope

## 7) Quality Gate Checklist
Pred zakljuckom mora vsak task potrditi:
- [ ] Scope spostovan
- [ ] Contracts ohranjeni
- [ ] Diagnostics dodani/posodobljeni
- [ ] Validation ukazi izvedeni
- [ ] Evidence prilozen
- [ ] Ni silent fallbackov
- [ ] Ni architecture drift-a

## 8) Escalation Rule
Ce task zahteva arhitekturno spremembo:
- STOP izvedba
- predlagaj ADR
- nadaljuj sele po potrditvi odlocitve
