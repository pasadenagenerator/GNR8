# DNS/Provider Control-Plane Checkpoint (May 2026)

## 1. Purpose

This checkpoint documents the completed DNS/provider control-plane scope, clarifies current hard boundaries, and defines recommended next execution-plane phases.

## 2. Completed control-plane layers

- agency provider settings
- credential references
- credential resolution
- provider selection
- provider communicator
- provider adapters:
  - manual
  - mock_provider
  - openprovider sandbox
- provider credential boundary
- provider execution gate
- DNS readiness plan
- domain lifecycle
- execution intent
- execution dry-run
- provider job planner
- provider job repository foundation
- operation bundle
- operation orchestrator
- approval requirement
- approval artifact
- approval repository foundation
- approval transitions
- approval transition repository foundation
- execution handoff
- execution handoff repository foundation
- worker pickup readiness

## 3. Current hard boundaries

- no live provider execution
- no worker execution
- no Openprovider API calls
- no DNS writes
- no domain purchase
- no secret values stored/read
- no external registrar calls

## 4. Current DB readiness state

- provider jobs table exists
- agency provider settings table exists
- provider credential references table missing until migration applied
- approval/handoff tables exist as migrations but DB application status depends on target DB

## 5. Openprovider status

- sandbox adapter exists
- deterministic only
- readiness ready_for_sandbox
- credential contract defined
- sandbox operation bundle blocks safely on credential boundary
- not live-ready

## 6. Validation baseline

- route-harness active/active passes
- platform build passes
- worker build passes
- provider/DNS/preview smoke suites pass
- DB-backed tests skip when env/table missing

## 7. Next recommended phases

A. Apply missing migrations  
B. DB-backed repository validation  
C. approval lifecycle API  
D. worker pickup simulation  
E. mock_provider execution simulation  
F. Openprovider sandbox API connector  
G. live execution gates, much later
