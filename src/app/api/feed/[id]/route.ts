import { NextResponse } from 'next/server';
import { gql } from '@apollo/client';
import { client } from '@/utils/apolloClient';

interface FeedSettings {
  country: string;
  language: string;
  currency: string;
  format: 'XML' | 'CSV' | 'TSV';
  updateFrequency: 'hourly' | 'daily' | 'weekly';
  collectionId?: string;
  productIds?: string[];
  excludedProductIds?: string[];
  includeVariants: boolean;
  customAttributes: Record<string, string>;
  metafieldMappings: Record<string, string>;
}

const GET_PRODUCTS = gql`
  query GetProducts($ids: [ID!], $collectionId: ID) {
    nodes(ids: $ids) {
      ... on Product {
        id
        title
        handle
        vendor
        description
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
`;

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // In a real app, fetch feed settings from database
    const feedSettings: FeedSettings = {
      country: 'GB',
      language: 'en',
      currency: 'GBP',
      format: 'XML',
      updateFrequency: 'daily',
      includeVariants: true,
      customAttributes: {},
      metafieldMappings: {},
    };

    const { searchParams } = new URL(request.url);
    const productIds = searchParams.get('productIds')?.split(',');
    const collectionId = searchParams.get('collectionId');

    const { data } = await client.query({
      query: GET_PRODUCTS,
      variables: {
        ids: productIds,
        collectionId,
      },
    });

    const products = data.nodes.map((node: any) => ({
      id: node.id,
      title: node.title,
      description: node.description,
      link: `https://${process.env.NEXT_PUBLIC_SHOPIFY_SHOP_DOMAIN}/products/${node.handle}`,
      imageLink: node.images.edges[0]?.node.url,
      price: `${node.variants.edges[0]?.node.price} ${feedSettings.currency}`,
      brand: node.vendor,
      gtin: node.variants.edges[0]?.node.barcode || '',
      mpn: node.variants.edges[0]?.node.sku || '',
      condition: 'new',
      availability: 'in stock',
      // Add custom attributes
      ...Object.entries(feedSettings.customAttributes).reduce((acc, [key, value]) => ({
        ...acc,
        [key]: value,
      }), {}),
    }));

    switch (feedSettings.format) {
      case 'CSV':
        return new NextResponse(generateCSV(products), {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="feed-${params.id}.csv"`,
          },
        });
      case 'TSV':
        return new NextResponse(generateTSV(products), {
          headers: {
            'Content-Type': 'text/tab-separated-values',
            'Content-Disposition': `attachment; filename="feed-${params.id}.tsv"`,
          },
        });
      default:
        return new NextResponse(generateXML(products, feedSettings), {
          headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 'public, max-age=3600',
          },
        });
    }
  } catch (error) {
    console.error('Feed generation failed:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to generate feed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

function generateXML(products: any[], settings: FeedSettings): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Product Feed</title>
    <link>${process.env.NEXT_PUBLIC_SHOPIFY_SHOP_DOMAIN}</link>
    <description>Product feed for Google Merchant Center</description>
    ${products.map(product => `
    <item>
      <g:id>${product.id}</g:id>
      <g:title>${product.title}</g:title>
      <g:description>${product.description}</g:description>
      <g:link>${product.link}</g:link>
      <g:image_link>${product.imageLink}</g:image_link>
      <g:price>${product.price}</g:price>
      <g:brand>${product.brand}</g:brand>
      <g:condition>${product.condition}</g:condition>
      <g:availability>${product.availability}</g:availability>
      <g:gtin>${product.gtin}</g:gtin>
      <g:mpn>${product.mpn}</g:mpn>
      ${Object.entries(settings.customAttributes).map(([key, value]) => 
        `<g:${key}>${value}</g:${key}>`
      ).join('\n      ')}
    </item>
    `).join('')}
  </channel>
</rss>`;
}

function generateCSV(products: any[]): string {
  const headers = ['id', 'title', 'description', 'link', 'image_link', 'price', 'brand', 'condition', 'availability', 'gtin', 'mpn'];
  const rows = [
    headers.join(','),
    ...products.map(product => 
      headers.map(header => `"${product[header]}"`).join(',')
    )
  ];
  return rows.join('\n');
}

function generateTSV(products: any[]): string {
  const headers = ['id', 'title', 'description', 'link', 'image_link', 'price', 'brand', 'condition', 'availability', 'gtin', 'mpn'];
  const rows = [
    headers.join('\t'),
    ...products.map(product => 
      headers.map(header => product[header]).join('\t')
    )
  ];
  return rows.join('\n');
} 