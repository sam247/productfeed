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
}

module.exports = nextConfig
