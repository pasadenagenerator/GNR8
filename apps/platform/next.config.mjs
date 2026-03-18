/** @type {import('next').NextConfig} */
const nextConfig = {
  // NUJNO za monorepo + ESM workspace pakete
  transpilePackages: ['@gnr8/core', '@gnr8/data'],

  // Next.js 15+: namesto experimental.serverComponentsExternalPackages
  // (stabilnejše pri server bundlingu, ko uporabljaš native deps kot "pg")
  serverExternalPackages: ['pg'],

  // Dobrodošlo pri API-heavy appih (ni obvezno, ampak stabilno)
  output: 'standalone',

  // Ensure the deterministic phase-1 validation fixture is bundled into the runtime output.
  // Without this, Vercel/standalone output tracing may omit non-imported files, and the
  // validation shell routes (/validation/real-site-01, /validation/real-site-02, /validation/real-site-03 and matching API routes) will fail
  // at runtime when it attempts to read fixture files from disk.
  outputFileTracingIncludes: {
    '/validation': [
      './gnr8/validation/fixtures/real-site-01/**',
      './gnr8/validation/fixtures/real-site-02/**',
      './gnr8/validation/fixtures/real-site-03/**',
    ],
    '/validation/real-site-01': ['./gnr8/validation/fixtures/real-site-01/**'],
    '/validation/real-site-02': ['./gnr8/validation/fixtures/real-site-02/**'],
    '/validation/real-site-03': ['./gnr8/validation/fixtures/real-site-03/**'],
    '/api/validation/real-site-01': ['./gnr8/validation/fixtures/real-site-01/**'],
    '/api/validation/real-site-02': ['./gnr8/validation/fixtures/real-site-02/**'],
    '/api/validation/real-site-03': ['./gnr8/validation/fixtures/real-site-03/**'],
  },
}

export default nextConfig
