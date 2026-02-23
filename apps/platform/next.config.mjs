/** @type {import('next').NextConfig} */
const nextConfig = {
  // NUJNO za monorepo + ESM workspace pakete
  transpilePackages: ['@gnr8/core', '@gnr8/data'],

  // Priporočeno: prepreči edge-case težave pri server bundlingu
  experimental: {
    serverComponentsExternalPackages: ['pg'],
  },

  // Dobrodošlo pri API-heavy appih (ni obvezno, ampak stabilno)
  output: 'standalone',
}

export default nextConfig