/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone output for packaging as executable
  output: 'standalone',

  // Externalize packages with native bindings that don't bundle well
  serverExternalPackages: ['better-sqlite3'],

  // Exclude large directories from standalone build to prevent size bloat
  outputFileTracingExcludes: {
    '*': [
      './distribute/**',
      './dist-electron/**',
      './dist-server/**',
      './temp-server-build/**',
      './.node-portable/**',
      './electron-app/node_modules/**',
    ],
  },

  // Disable image optimization to avoid Sharp dependency issues
  images: {
    unoptimized: true,
  },

  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'no-referrer' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    }];
  },
};

module.exports = nextConfig;
