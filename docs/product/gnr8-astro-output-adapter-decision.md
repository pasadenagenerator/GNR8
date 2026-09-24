# GNR8 Astro Output Adapter Decision

## Decision

Astro is the first preferred source-backed output adapter for GNR8-generated static and business websites. The initial adapter is a skeleton/proof boundary only: it defines how normalized GNR8 site content can become a deterministic Astro source workspace, but it does not replace production rendering, publishing, or current runtime artifact generation.

The existing HTML/static artifact runtime remains valid and is the fallback path for generated sites. Current CHS/ARIS runtime previews, publish paths, live pointers, shadow publish flows, DNS, provider, billing, rollback, dry-run, source capture, and customer-domain paths are unchanged.

## Why Astro First

Airship integration work showed that real visual editing works best against source-backed projects with workspace files, a git baseline, a dev/static server, source diffs, and a capture/map/apply bridge. Astro is a good first target because it has a simple project model, builds fast static websites, fits marketing and business sites, and works naturally with Airship's dev-server workflow. Airship can target an Astro dev server on Astro's default port, `4321`.

Astro is especially suitable for CHS/ARIS-style marketing and business sites: home pages, service cards, contact sections, proof blocks, calls to action, and polished static content.

## Adapter Direction

Astro is not the only future output target. The adapter boundary should allow additional targets such as:

- `html-static`
- `next-app`
- `shopify-theme`
- `wordpress-theme`
- `custom-template`

The adapter choice should be based on the site class, mutation needs, commerce/application requirements, source ownership model, and deployment target. Astro is not automatically the right output for every ecommerce or app case. Storefronts, carts, checkout, CMS-authoring workflows, theme ecosystems, and custom app behavior need later adapters and explicit product decisions.

## Airship Readback

The future Airship worker should use the Astro adapter as a source-backed workspace preparation step:

1. Generate or hydrate an Astro workspace from normalized GNR8 site content.
2. Create a git baseline for the generated source.
3. Run the Astro dev server on `127.0.0.1:4321`.
4. Run the Airship CLI against port `4321`.
5. Capture source diffs after Airship edits.
6. Map and apply only supported edit categories through a controlled mutation boundary.
7. Build/export a candidate for review.

This worker path is future work. This decision records the target shape and proof skeleton only.

## Limits

This decision does not make all GNR8 sites Astro sites.

This decision does not publish Astro output.

This decision does not deploy anything.

This decision does not mutate live pointers, shadow pointers, runtime artifacts, current CHS/ARIS previews, Airship draft/candidate generation logic, DNS, provider settings, billing, environment configuration, source capture, customer-domain paths, rollback, dry-run, or shadow-publish paths.

Ecommerce and store support require later adapter work, likely including `shopify-theme`, `next-app`, or another commerce-aware output target.

The current generated artifact path remains the production fallback while the Astro source-backed path matures.
