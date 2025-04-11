/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL,
    SHOPIFY_ACCESS_TOKEN: process.env.SHOPIFY_ACCESS_TOKEN,
  },
  images: {
    domains: ['cdn.shopify.com'],
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
