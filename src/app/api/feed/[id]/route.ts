import { NextResponse } from 'next/server';
import { gql } from '@apollo/client';
import { client } from '@/utils/apolloClient';
import { prisma } from '@/utils/db';
import { FeedValidator, validateFeed } from '@/utils/feedValidation';
import FeedMonitor from '@/utils/feedMonitoring';
import { FeedVersionManager } from '@/utils/feedVersionManager';

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
    // Initialize feed monitor
    const monitor = new FeedMonitor(params.id, 'current', 0, 'XML');

    // Fetch feed settings and validate request
    const feed = await prisma.feed.findUnique({
      where: { id: params.id },
      include: { shop: true }
    });

    if (!feed) {
      return NextResponse.json({ error: 'Feed not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const productIds = searchParams.get('productIds')?.split(',');
    const collectionId = searchParams.get('collectionId');

    // Fetch products from Shopify
    const { data } = await client.query({
      query: GET_PRODUCTS,
      variables: {
        ids: productIds,
        collectionId,
      },
    });

    // Transform products into the format expected by the validator
    const products = data.nodes.map((node: any) => ({
      id: node.id,
      title: node.title,
      description: node.description,
      link: `https://${process.env.NEXT_PUBLIC_SHOPIFY_SHOP_DOMAIN}/products/${node.handle}`,
      imageLink: node.images.edges[0]?.node.url,
      price: `${node.variants.edges[0]?.node.price} ${feed.settings.currency}`,
      brand: node.vendor,
      gtin: node.variants.edges[0]?.node.barcode || '',
      mpn: node.variants.edges[0]?.node.sku || '',
      condition: 'new',
      availability: 'in stock',
      // Add custom attributes
      ...Object.entries(feed.settings.customAttributes).reduce((acc, [key, value]) => ({
        ...acc,
        [key]: value,
      }), {}),
    }));

    // Update monitor with total product count
    monitor.updateTotalProducts(products.length);

    // Validate products
    const validationResults = await validateFeed(products, (progress) => {
      monitor.updateProgress(progress);
    });

    // Generate feed only with valid products
    const xml = generateXML(validationResults.validProducts, feed.settings);

    // Create new feed version
    await FeedVersionManager.createVersion(
      params.id,
      xml,
      'XML',
      {
        totalProducts: products.length,
        validProducts: validationResults.validProducts.length,
        invalidProducts: validationResults.invalidProducts.length,
        errors: validationResults.errors,
        warnings: validationResults.warnings,
      }
    );

    // Update feed stats in database
    await prisma.feed.update({
      where: { id: params.id },
      data: {
        lastSync: new Date(),
        stats: {
          totalProducts: products.length,
          validProducts: validationResults.validProducts.length,
          invalidProducts: validationResults.invalidProducts.length,
          errors: validationResults.errors,
          warnings: validationResults.warnings,
        },
      },
    });

    // Complete monitoring
    monitor.complete();

    // Return appropriate response based on validation results
    if (validationResults.invalidProducts.length > 0) {
      return NextResponse.json({
        xml,
        validation: {
          hasErrors: true,
          validProducts: validationResults.validProducts.length,
          invalidProducts: validationResults.invalidProducts.length,
          errors: validationResults.errors,
          warnings: validationResults.warnings,
        },
      }, { status: 206 }); // Partial Content
    }

    return NextResponse.json({ xml });
  } catch (error: any) {
    console.error('Error generating feed:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate feed' },
      { status: 500 }
    );
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

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.feed.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete feed:', error);
    return NextResponse.json(
      { error: 'Failed to delete feed' },
      { status: 500 }
    );
  }
} 