/** @type {import('next').NextConfig} */
const nextConfig = {
  // NUJNO za monorepo + ESM workspace pakete
  transpilePackages: ['@gnr8/core', '@gnr8/data'],

  // Next.js 15+: namesto experimental.serverComponentsExternalPackages
  // (stabilnejše pri server bundlingu, ko uporabljaš native deps kot "pg")
  serverExternalPackages: ['pg', 'playwright', 'playwright-core'],

  // Dobrodošlo pri API-heavy appih (ni obvezno, ampak stabilno)
  output: 'standalone',

  // Ensure the deterministic phase-1 validation fixture is bundled into the runtime output.
  // Without this, Vercel/standalone output tracing may omit non-imported files, and the
  // validation shell routes (/validation/real-site-01, /validation/real-site-02, /validation/real-site-03, /validation/friend-site-01
  // and matching API routes) will fail
  // at runtime when it attempts to read fixture files from disk.
  outputFileTracingIncludes: {
    '/validation': [
      './gnr8/validation/fixtures/real-site-01/**',
      './gnr8/validation/fixtures/real-site-02/**',
      './gnr8/validation/fixtures/real-site-03/**',
      './gnr8/validation/fixtures/friend-site-01/**',
    ],
    '/validation/real-site-01': ['./gnr8/validation/fixtures/real-site-01/**'],
    '/validation/real-site-02': ['./gnr8/validation/fixtures/real-site-02/**'],
    '/validation/real-site-03': ['./gnr8/validation/fixtures/real-site-03/**'],
    '/validation/friend-site-01': ['./gnr8/validation/fixtures/friend-site-01/**'],
    '/validation/beta-export-operator': [
      './gnr8/validation/fixtures/real-site-01/**',
      './gnr8/validation/fixtures/real-site-02/**',
      './gnr8/validation/fixtures/real-site-03/**',
      './gnr8/validation/fixtures/friend-site-01/**',
    ],
    '/api/validation/real-site-01': ['./gnr8/validation/fixtures/real-site-01/**'],
    '/api/validation/real-site-02': ['./gnr8/validation/fixtures/real-site-02/**'],
    '/api/validation/real-site-03': ['./gnr8/validation/fixtures/real-site-03/**'],
    '/api/validation/friend-site-01': ['./gnr8/validation/fixtures/friend-site-01/**'],
    '/api/validation/url-import': [
      './node_modules/playwright/.local-browsers/**',
      './node_modules/playwright-core/.local-browsers/**',
      './node_modules/playwright-core/lib/server/registry/**',
    ],
    '/api/gnr8/runtime/migrate/url': [
      './node_modules/playwright/.local-browsers/**',
      './node_modules/playwright-core/.local-browsers/**',
      './node_modules/playwright-core/lib/server/registry/**',
    ],
    '/api/gnr8/agency/clients/[clientId]/sites/import': [
      './node_modules/playwright/.local-browsers/**',
      './node_modules/playwright-core/.local-browsers/**',
      './node_modules/playwright-core/lib/server/registry/**',
    ],
  },

  // Keep client template/site CRUD serverless traces focused on route-safe runtime inputs.
  // These routes do not execute validation fixtures, tests, build cache artifacts, or browser binaries.
  outputFileTracingExcludes: {
    '*': [
      '../worker/**',
      '../../worker/**',
      'apps/worker/**',
      './gnr8/import-rendered-capture-worker/**',
      './gnr8/rendered-capture-worker-server/**',
      './dist-rendered-capture-worker/**',
    ],
    '/api/gnr8/clients/[clientId]/templates': [
      './gnr8/validation/**',
      './gnr8/**/*.test.ts',
      './app/**/*.test.ts',
      './src/**/*.test.ts',
      './dist-rendered-capture-worker/**',
      './node_modules/playwright/**',
      './node_modules/playwright-core/**',
      './tsconfig.tsbuildinfo',
    ],
    '/api/gnr8/clients/[clientId]/templates/[templateId]': [
      './gnr8/validation/**',
      './gnr8/**/*.test.ts',
      './app/**/*.test.ts',
      './src/**/*.test.ts',
      './dist-rendered-capture-worker/**',
      './node_modules/playwright/**',
      './node_modules/playwright-core/**',
      './tsconfig.tsbuildinfo',
    ],
    '/api/gnr8/clients/[clientId]/templates/upload': [
      './gnr8/validation/**',
      './gnr8/**/*.test.ts',
      './app/**/*.test.ts',
      './src/**/*.test.ts',
      './app/gnr8/**',
      './docs/**',
      './src/workspace/**',
      './supabase/.temp/**',
      './supabase/migrations/**',
      './supabase/schema/**',
      './gnr8/ai/**',
      './gnr8/architecture/**',
      './gnr8/chai-removal/**',
      './gnr8/command-center/**',
      './gnr8/design-adapter/**',
      './gnr8/design-intelligence/**',
      './gnr8/migration/**',
      './gnr8/migration-factory/**',
      './gnr8/platform-audits/**',
      './gnr8/rendered-capture-worker-server/**',
      './gnr8/runtime/**',
      './gnr8/**/*.md',
      './*.md',
      './dist-rendered-capture-worker/**',
      './node_modules/playwright/**',
      './node_modules/playwright-core/**',
      './tsconfig.tsbuildinfo',
    ],
    '/api/gnr8/clients/[clientId]/sites': [
      './gnr8/validation/**',
      './gnr8/**/*.test.ts',
      './app/**/*.test.ts',
      './src/**/*.test.ts',
      './dist-rendered-capture-worker/**',
      './node_modules/playwright/**',
      './node_modules/playwright-core/**',
      './tsconfig.tsbuildinfo',
    ],
  },
}

export default nextConfig
