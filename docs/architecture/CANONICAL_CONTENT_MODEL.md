# Canonical Content Model Architecture

## Status
- Draft: canonical architecture direction
- Scope: architecture/docs only
- Non-goals: no runtime changes, no APIs, no UI, no editor implementation, no database changes

## Purpose
Content in GNR8 is not page HTML.

Content is structured, governed, versionable website knowledge.

## Core Content Entities
Canonical content entities:
- Site
- Page
- Section
- Content Block
- Collection
- Collection Item
- Media Asset
- Product
- SEO Metadata
- Navigation Label
- Translation Variant

## Content Types
Canonical content types:
- editorial content
- marketing content
- commerce content
- media content
- navigational content
- metadata content
- localized content

## Content Identity
Every content entity should include:
- `contentId`
- `contentType`
- `stableKey`
- `source`
- `ownerScope`
- `locale`
- `versionId`
- `status`

Identity principle:
- identity is stable across edits while versions capture mutations over time

## Content Relationships
Canonical relationship examples:
- Page contains Sections
- Section contains Content Blocks
- Collection contains Collection Items
- Product belongs to Collection
- Navigation references Page
- SEO Metadata belongs to Page or Product
- Media Asset can be reused across entities

## Governance Principles
The content model follows these principles:
- content before layout
- identity before mutation
- version before publish
- rollback before overwrite
- AI suggestions before AI mutations

## AI Editing Implications
AI should edit structured content intents, not raw HTML when possible.

Canonical examples:
- improve headline
- rewrite section body
- generate SEO title
- translate page
- summarize product
- create content variant

## Current State
Architecture only.

Explicitly:
- no canonical content model runtime implemented yet
- no editor implemented yet
- no content DB schema implemented yet

## Future Integration Points
This architecture will integrate with:
- Canonical Design Model
- AI Editor Architecture
- Versioning & Rollback Architecture
- Publish Governance Architecture
- Import Pipeline
- Preview Renderer

## Success Condition
GNR8 gains the canonical content model foundation for future AI-native editing.
