# Shopify Product Feed Manager

A Next.js application that helps Shopify merchants create and manage product feeds for Google Merchant Center.

## Features

- Multiple feed format support (XML, CSV, TSV)
- Customizable feed settings (country, language, currency)
- Product/collection selection
- Scheduled and manual sync options
- Feed URL generation for Google Merchant Center
- Analytics tracking

## Tech Stack

- Next.js 14
- TypeScript
- Prisma (Database ORM)
- Shopify API
- Stripe (Payment processing)
- Vercel (Deployment)

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

Required environment variables:

- `DATABASE_URL`: Your PostgreSQL database URL
- `STRIPE_SECRET_KEY`: Stripe secret key
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook secret
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Stripe publishable key
- `NEXT_PUBLIC_APP_URL`: Your app's URL
- `SHOPIFY_APP_URL`: Shopify app URL
- `SHOPIFY_ACCESS_TOKEN`: Shopify access token

## Deployment

The app is configured for deployment on Vercel. Connect your GitHub repository to Vercel and set the required environment variables in the Vercel dashboard.
