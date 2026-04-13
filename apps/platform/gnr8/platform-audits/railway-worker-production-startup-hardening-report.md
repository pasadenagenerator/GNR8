# Railway Worker Production Startup Hardening Report

## 1. Root Cause Of Current Startup Fragility

The worker was started in production through runtime TypeScript execution:

- `pnpm exec tsx gnr8/rendered-capture-worker-server/index.ts`

This path adds extra startup overhead (`pnpm` process + `tsx` transpilation/runtime loader) and is less predictable in constrained container environments, which aligns with the observed Railway startup termination (`SIGKILL` during `tsx` startup path).

## 2. Old Runtime Model vs New Runtime Model

Old model:

- Runtime command: `pnpm exec tsx .../index.ts`
- Production startup depended on runtime transpilation.

New model:

- Build step compiles worker TypeScript to JavaScript under:
  - `apps/platform/dist-rendered-capture-worker/gnr8/rendered-capture-worker-server/index.js`
- Runtime command is plain Node:
  - `node apps/platform/dist-rendered-capture-worker/gnr8/rendered-capture-worker-server/index.js`
- No `tsx` in production runtime path.
- No `pnpm exec` in production runtime command.

## 3. Build Strategy Used

- Added dedicated worker build config:
  - `apps/platform/gnr8/rendered-capture-worker-server/tsconfig.build.json`
- Added worker build/runtime scripts in `apps/platform/package.json`:
  - `build:rendered-capture-worker`
  - `start:rendered-capture-worker`
- Added post-build script:
  - `apps/platform/gnr8/rendered-capture-worker-server/write-dist-package-json.mjs`
  - Writes `dist-rendered-capture-worker/package.json` with `"type": "commonjs"` and prunes non-runtime declaration artifacts.

## 4. Docker/Runtime Changes

Updated `apps/platform/gnr8/rendered-capture-worker-server/Dockerfile` to:

- install dependencies
- compile worker during image build via:
  - `pnpm --filter @gnr8/platform run build:rendered-capture-worker`
- start worker with Node on compiled output:
  - `CMD ["node", "apps/platform/dist-rendered-capture-worker/gnr8/rendered-capture-worker-server/index.js"]`

## 5. Manual Railway Validation Results

Status: **not executable from this local sandbox session** (no Railway deploy control in-session).

Required manual verification steps after deploy:

1. Redeploy Railway worker with updated Dockerfile/build path.
2. Confirm logs no longer contain `tsx ... SIGKILL` startup pattern.
3. Confirm worker remains alive after boot.
4. Confirm `GET /health` responds consistently with valid token.
5. Trigger one live import from the app and verify request reaches a stable running worker.

Local validation completed in this session:

- `pnpm --filter @gnr8/platform run build:rendered-capture-worker` passed.
- `pnpm exec tsc --noEmit` passed.
- `pnpm exec next build` passed.

## 6. Limitations

This task includes startup/runtime hardening only.

Explicitly not included:

- worker queue redesign
- computed style sampling redesign
- multi-page capture
- OCR
- billing/subscription gating

## 7. Next-Step Recommendation

Recommend: **A. Worker Phase 2.5 (Computed Style Sampling Reliability)**.
