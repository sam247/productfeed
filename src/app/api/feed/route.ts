import { NextResponse } from 'next/server';
import { gql } from '@apollo/client';
import { client } from '@/utils/apolloClient';

interface Product {
  id: string;
  title: string;
  handle: string;
  vendor: string;
  images: {
    edges: Array<{
      node: {
        url: string;
      };
    }>;
  };
  variants: {
    edges: Array<{
      node: {
        price: string;
        sku: string;
        barcode: string;
      };
    }>;
  };
}

const GET_PRODUCTS = gql`
  query GetProducts($collectionId: ID, $first: Int) {
    products(first: $first, query: $collectionId ? "collection_id:" + $collectionId : "") {
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
  const { searchParams } = new URL(request.url);
  const collectionId = searchParams.get('collectionId');
  const productIds = searchParams.get('productIds')?.split(',');
  const feedId = searchParams.get('feedId');
  
  try {
    // Get current tier from localStorage or API
    const currentTier = JSON.parse(localStorage.getItem('currentTier') || '{"productLimit": 100}');
    const productLimit = currentTier.productLimit;

    let query = GET_PRODUCTS;
    let variables: any = { first: productLimit };

    if (collectionId) {
      variables.collectionId = collectionId;
    } else if (productIds?.length) {
      // Create a query for specific products
      query = gql`
        query GetProductsByIds($ids: [ID!]!, $first: Int) {
          nodes(ids: $ids) {
            ... on Product {
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
      `;
      variables.ids = productIds.slice(0, productLimit);
    }

    const { data } = await client.query({
      query,
      variables,
    });

    const products = collectionId 
      ? data.products.edges.map(({ node }: { node: Product }) => ({
          id: node.id,
          title: node.title,
          handle: node.handle,
          vendor: node.vendor,
          imageUrl: node.images.edges[0]?.node.url,
          price: node.variants.edges[0]?.node.price,
          sku: node.variants.edges[0]?.node.sku,
          barcode: node.variants.edges[0]?.node.barcode,
        }))
      : data.nodes.map((node: Product) => ({
          id: node.id,
          title: node.title,
          handle: node.handle,
          vendor: node.vendor,
          imageUrl: node.images.edges[0]?.node.url,
          price: node.variants.edges[0]?.node.price,
          sku: node.variants.edges[0]?.node.sku,
          barcode: node.variants.edges[0]?.node.barcode,
        }));

    // If we hit the product limit, add a warning
    const warning = products.length >= productLimit 
      ? `<!-- Warning: Product limit of ${productLimit} reached. Upgrade your plan for more products. -->`
      : '';

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Shopify Product Feed</title>
    <link>${process.env.NEXT_PUBLIC_SHOPIFY_SHOP_DOMAIN}</link>
    <description>Product feed for Google Merchant Center</description>
    ${warning}
    ${products.map((product: any) => `
    <item>
      <g:id>${product.id}</g:id>
      <g:title>${product.title}</g:title>
      <g:brand>${product.vendor}</g:brand>
      <g:link>https://${process.env.NEXT_PUBLIC_SHOPIFY_SHOP_DOMAIN}/products/${product.handle}</g:link>
      <g:image_link>${product.imageUrl}</g:image_link>
      <g:price>${product.price} USD</g:price>
      <g:mpn>${product.sku || ''}</g:mpn>
      <g:gtin>${product.barcode || ''}</g:gtin>
    </item>
    `).join('')}
  </channel>
</rss>`;

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    return new NextResponse(JSON.stringify({ error: 'Failed to generate feed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 