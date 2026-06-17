/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    tsconfigPath: './tsconfig.build.json',
  },
  output: 'standalone',
  serverExternalPackages: ['pg', 'playwright', 'playwright-core', '@sparticuz/chromium'],
  webpack(config, { isServer }) {
    if (isServer) {
      const externalPackages = new Set(['playwright', 'playwright-core', '@sparticuz/chromium'])
      config.externals.push(({ request }, callback) => {
        if (request && externalPackages.has(request)) {
          return callback(null, `commonjs ${request}`)
        }
        return callback()
      })
    }
    return config
  },
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
