// Sentry v11 ships its build wrapper from the /config subpath.
import { withSentryConfig } from '@sentry/nextjs/config'

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    minimumCacheTTL: 2678400 * 6, // 3 months
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'a0.muscache.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.gstatic.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'fra.cloud.appwrite.io',
        port: '',
        pathname: '/**',
      },
    ],
  },
}

// Sentry (plan pickltmobile/.agent/plans/sentry.md): EU region; source maps
// upload only when SENTRY_AUTH_TOKEN is set (a Vercel env var, never in the
// repo); browser reports tunnel through /monitoring on our own domain.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG || 'picklte',
  project: 'picklte-web',
  sentryUrl: 'https://de.sentry.io/',
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: '/monitoring',
})
