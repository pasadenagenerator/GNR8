// Keep the serverless worker entrypoint inside the worker project boundary while
// reusing the canonical Platform implementation. This makes Vercel's worker
// dependency graph rebuild when the shared generation service changes.
export { runSourceBackedAstroGeneration } from "../../../platform/gnr8/output-adapters/source-backed-astro-generation-service";
