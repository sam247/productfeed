# Product Feed Manager

A Shopify app to manage and generate product feeds for Google Merchant Center.

## Features

- Generate product feeds in Google Merchant Center format
- Filter products by collection
- Validate required fields
- Automatic feed updates
- Shopify billing integration

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Prisma (PostgreSQL)
- Shopify Polaris
- GraphQL (Apollo Client)
- Tailwind CSS

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables in `.env`:
   ```
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/productfeed
   SHOPIFY_SHOP_URL=https://your-shop-name.myshopify.com
   SHOPIFY_API_KEY=your_api_key
   SHOPIFY_API_SECRET=your_api_secret
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```
4. Run database migrations:
   ```bash
   npx prisma migrate dev
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

Required environment variables:

- `DATABASE_URL`: PostgreSQL database URL
- `SHOPIFY_SHOP_URL`: Your Shopify store URL
- `SHOPIFY_API_KEY`: Shopify API key
- `SHOPIFY_API_SECRET`: Shopify API secret
- `NEXT_PUBLIC_APP_URL`: Your app's URL

## Deployment

1. Create a new project on Vercel
2. Connect your GitHub repository
3. Set up the environment variables in Vercel's dashboard
4. Deploy!
