# Canonical Experience Model Architecture

## Status
- Draft: canonical architecture direction
- Scope: architecture/docs only
- Non-goals: no runtime changes, no APIs, no UI, no editor implementation, no database changes

## Purpose
Experience is not content.

Experience is not design.

Experience defines how users move through a digital system.

## Core Experience Entities
- `Experience`
- `Journey`
- `Step`
- `Intent`
- `Goal`
- `Conversion Point`
- `Interaction`
- `Personalization Rule`
- `Trigger`
- `Outcome`

## Experience Types
- `marketing journey`
- `lead generation journey`
- `commerce journey`
- `onboarding journey`
- `support journey`
- `account journey`

## Experience Identity
Canonical identity fields:
- `experienceId`
- `experienceType`
- `stableKey`
- `ownerScope`
- `versionId`
- `status`

## Experience Relationships
Canonical relationship chain:

```text
Experience
  -> Journeys

Journey
  -> Steps

Step
  -> Interactions

Interactions
  -> Outcomes

Personalization Rules
  -> Journeys

Triggers
  -> Outcomes
```

## Governance Principles
- `intent before flow`
- `journey before page`
- `outcome before interaction`
- `version before publish`
- `rollback before overwrite`

## AI Experience Editing
Representative AI prompts:
- `improve conversion flow`
- `reduce checkout friction`
- `optimize onboarding`
- `generate support journey`
- `create personalized journey`
- `improve navigation path`

## Content / Design / Experience Separation
Content answers:

What is being said?

Design answers:

How is it presented?

Experience answers:

How does the user move?

## Current State
Architecture only.

Explicitly:
- no experience runtime implemented
- no journey engine implemented
- no personalization engine implemented

## Future Integration Points
- Canonical Content Model
- Canonical Design Model
- AI Editor Architecture
- Versioning & Rollback Architecture
- Publish Governance Architecture
- AI Optimization Layer

## Success Condition
GNR8 gains the third foundational model of the AI-native Website Operating System:

Content + Design + Experience.
