import { NextResponse } from 'next/server';
import { gql } from '@apollo/client';
import { client } from '@/utils/apolloClient';
import { prisma } from '@/utils/db';

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

interface BaseFeed {
  id: string;
  shopId: string;
  name: string;
  settings: {
    productIds?: string[];
    [key: string]: any;
  };
  url: string;
  lastSync: Date | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const GET_PRODUCTS = gql`
  query GetProducts($collectionId: String, $first: Int!) {
    products(first: $first, query: $collectionId) {
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

const GET_PRODUCTS_BY_IDS = gql`
  query GetProductsByIds($ids: [ID!]!, $first: Int!) {
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

export async function GET(request: Request) {
  try {
    // Get the current shop's feeds
    const shop = await prisma.shop.findFirst({
      include: {
        feeds: true,
      },
    });

    if (!shop) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      );
    }

    // Calculate current usage
    const currentProducts = (shop.feeds as BaseFeed[]).reduce((total: number, feed: BaseFeed) => {
      return total + (feed.settings.productIds?.length || 0);
    }, 0);

    return NextResponse.json({
      feeds: shop.feeds,
      usage: {
        products: currentProducts,
        feeds: shop.feeds.length,
        limits: {
          productLimit: shop.productLimit,
          feedLimit: shop.feedLimit,
          productsPerFeedLimit: shop.productsPerFeedLimit,
        },
      },
    });
  } catch (error) {
    console.error('Failed to list feeds:', error);
    return NextResponse.json(
      { error: 'Failed to list feeds' },
      { status: 500 }
    );
  }
} 