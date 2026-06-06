import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import { withSentryConfig } from "@sentry/nextjs";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control",    value: "on" },
  { key: "X-Frame-Options",           value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options",    value: "nosniff" },
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // /monitoring is the Sentry tunnel route — routes Sentry traffic through
      // our own domain, so no external Sentry domains needed in connect-src.
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://lh3.googleusercontent.com https://wwowqxlwabtynubsntku.supabase.co",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig = (phase: string): NextConfig => ({
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
  allowedDevOrigins: ["192.168.1.108"],
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "wwowqxlwabtynubsntku.supabase.co" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        source: "/api/(.*)",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
        ],
      },
      {
        source: "/api/qr/:id/image",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
    ];
  },
});

export default withSentryConfig(nextConfig, {
  // Suppress noisy build output; CI logs remain clean
  silent: !process.env.CI,
  // Upload source maps only when SENTRY_AUTH_TOKEN is present (i.e. in CI/CD)
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Route Sentry SDK requests through /monitoring instead of sentry.io directly.
  // Keeps connect-src CSP tight (no *.sentry.io needed).
  tunnelRoute: "/monitoring",
  // Upload source maps but hide them from the browser bundle
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
  // Tree-shake Sentry logger in production (replaces deprecated disableLogger)
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
  // Widen client file upload for better stack traces on minified bundles
  widenClientFileUpload: true,
});
