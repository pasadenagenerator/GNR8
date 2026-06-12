/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    tsconfigPath: './tsconfig.build.json',
  },
  output: 'standalone',
  serverExternalPackages: ['pg'],
  outputFileTracingExcludes: {
    '*': [
      './.next/cache/**',
      './.next/cache/**/*',
      './.next/cache*/**',
      './coverage/**',
      './tsconfig.tsbuildinfo',
      './**/*.test.ts',
      './**/*.test.tsx',
      './**/_tests/**',
      './**/__fixtures__/**',
      './**/fixtures/**',
      '../platform/**/*.test.ts',
      '../platform/**/*.test.tsx',
      '../platform/**/_tests/**',
      '../platform/**/__fixtures__/**',
      '../platform/**/fixtures/**',
      '../platform/.next/cache/**',
    ],
  },
}

export default nextConfig
