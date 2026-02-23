/** @type {import('next').NextConfig} */
const nextConfig = {
  // NUJNO za monorepo + ESM workspace pakete
  transpilePackages: ['@gnr8/core', '@gnr8/data'],

  // Next.js 15+: namesto experimental.serverComponentsExternalPackages
  // (stabilnejše pri server bundlingu, ko uporabljaš native deps kot "pg")
  serverExternalPackages: ['pg'],

  // Dobrodošlo pri API-heavy appih (ni obvezno, ampak stabilno)
  output: 'standalone',
}

export default nextConfig