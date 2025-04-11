import { NextResponse } from 'next/server';
import prisma from '@/utils/db';
import { gql } from '@apollo/client';
import { client } from '@/utils/apolloClient';

const GET_PRODUCTS = gql`
  query GetProducts($collectionId: ID, $first: Int!) {
    products(
      first: $first
      query: $collectionId
    ) {
      edges {
        node {
          id
          title
          handle
          vendor
          images(first: 1) {
            edges {
              node {
                url
              }
            }
          }
          variants(first: 1) {
            edges {
              node {
                price
                sku
                barcode
              }
            }
          }
        }
      }
    }
  }
`;

export async function GET(request: Request) {
  try {
    // Get all active feeds
    const feeds = await prisma.feed.findMany({
      where: {
        status: 'active',
      },
      include: {
        shop: true,
      },
    });

    const now = new Date();
    const results = [];

    for (const feed of feeds) {
      const settings = feed.settings as any;
      const lastSync = feed.lastSync || new Date(0);
      const hoursSinceLastSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);

      // Check if it's time to sync based on frequency
      let shouldSync = false;
      switch (settings.updateFrequency) {
        case 'hourly':
          shouldSync = hoursSinceLastSync >= 1;
          break;
        case 'daily':
          shouldSync = hoursSinceLastSync >= 24;
          break;
        case 'weekly':
          shouldSync = hoursSinceLastSync >= 168;
          break;
      }

      if (!shouldSync) continue;

      try {
        // Get products based on feed settings
        const variables: any = { first: 100 }; // Default limit
        if (settings.collectionId) {
          variables.collectionId = `collection_id:${settings.collectionId}`;
        }

        const { data } = await client.query({
          query: GET_PRODUCTS,
          variables,
          context: {
            headers: {
              'X-Shopify-Access-Token': feed.shop.accessToken,
            },
          },
        });

        const products = data.products.edges.map(({ node }: any) => ({
          id: node.id,
          title: node.title,
          handle: node.handle,
          vendor: node.vendor,
          imageUrl: node.images.edges[0]?.node.url,
          price: node.variants.edges[0]?.node.price,
          sku: node.variants.edges[0]?.node.sku,
          barcode: node.variants.edges[0]?.node.barcode,
        }));

        // Generate feed content
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${feed.name}</title>
    <link>${process.env.NEXT_PUBLIC_SHOPIFY_SHOP_DOMAIN}</link>
    <description>Product feed for Google Merchant Center</description>
    ${products.map((product: any) => `
    <item>
      <g:id>${product.id}</g:id>
      <g:title>${product.title}</g:title>
      <g:brand>${product.vendor}</g:brand>
      <g:link>https://${process.env.NEXT_PUBLIC_SHOPIFY_SHOP_DOMAIN}/products/${product.handle}</g:link>
      <g:image_link>${product.imageUrl}</g:image_link>
      <g:price>${product.price} ${settings.currency}</g:price>
      <g:mpn>${product.sku || ''}</g:mpn>
      <g:gtin>${product.barcode || ''}</g:gtin>
    </item>
    `).join('')}
  </channel>
</rss>`;

        // Update feed with new content and timestamp
        await prisma.feed.update({
          where: { id: feed.id },
          data: {
            lastSync: now,
            settings: {
              ...settings,
              lastContent: xml,
            },
          },
        });

        results.push({
          feedId: feed.id,
          status: 'success',
          products: products.length,
        });
      } catch (error: any) {
        console.error(`Error updating feed ${feed.id}:`, error);
        results.push({
          feedId: feed.id,
          status: 'error',
          error: error.message || 'Unknown error',
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('Error in feed update cron job:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update feeds' },
      { status: 500 }
    );
  }
} 