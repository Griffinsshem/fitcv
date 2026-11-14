import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV !== 'production';
// Server-only: where the Express API lives. The browser never calls it
// directly — all /api/* traffic is proxied so cookies stay first-party.
const API_URL = (process.env.API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

const csp = [
  "default-src 'self'",
  // Next.js inlines small bootstrap scripts; Google Identity Services loads from accounts.google.com.
  `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ''} 'wasm-unsafe-eval' https://accounts.google.com/gsi/client`,
  "style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style",
  "img-src 'self' data: blob: https://*.googleusercontent.com",
  "font-src 'self' data:",
  // data:/blob: are needed by the in-browser PDF engine (WASM layout) and downloads.
  "connect-src 'self' data: blob: https://accounts.google.com/gsi/",
  'frame-src https://accounts.google.com/gsi/',
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // GIS popups need same-origin-allow-popups to postMessage back.
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@fitcv/shared'],
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_URL}/api/:path*` }];
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
