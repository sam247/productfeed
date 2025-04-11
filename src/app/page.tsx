'use client';

import { Page, Layout, Card, DataTable, Button, Banner, Loading, Toast, Checkbox } from "@shopify/polaris";
import { useState, useEffect, useCallback } from "react";
import { gql, useQuery, useApolloClient } from "@apollo/client";
import { SyncSettings } from "@/components/SyncSettings";

const GET_PRODUCTS = gql`
  query GetProducts($collectionId: ID) {
    products(first: 50, query: $collectionId ? "collection_id:\\\"" + $collectionId + "\\\"" : "") {
      edges {
        node {
          id
          title
          handle
          description
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
                inventoryQuantity
                barcode
              }
            }
          }
        }
      }
    }
  }
`;

const GET_COLLECTIONS = gql`
  query GetCollections {
    collections(first: 100) {
      edges {
        node {
          id
          title
        }
      }
    }
  }
`;

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

interface Collection {
  id: string;
  title: string;
}

export default function Home() {
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<string>('all');
  const [collections, setCollections] = useState<Collection[]>([]);
  const [feedUrl, setFeedUrl] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewXml, setPreviewXml] = useState<string>('');
  const [analytics, setAnalytics] = useState({
    totalProducts: 0,
    approvedProducts: 0,
    rejectedProducts: 0,
    invalidProducts: 0,
  });
  
  const client = useApolloClient();

  const { loading: collectionsLoading, error: collectionsError } = useQuery(GET_COLLECTIONS, {
    onCompleted: (data) => {
      setCollections(data.collections.edges.map((edge: any) => edge.node));
    },
  });

  const { loading, error, data } = useQuery(GET_PRODUCTS, {
    variables: {
      collectionId: selectedCollection === 'all' ? null : selectedCollection,
    },
  });

  useEffect(() => {
    const baseUrl = window.location.origin;
    let url = `${baseUrl}/api/feed`;
    
    if (selectedCollection !== 'all') {
      url += `?collectionId=${selectedCollection}`;
    } else if (selectedRows.length > 0) {
      const productIds = selectedRows
        .map(index => data?.products?.edges[index]?.node.id)
        .filter(Boolean)
        .join(',');
      url += `?productIds=${productIds}`;
    }
    
    setFeedUrl(url);
  }, [selectedCollection, selectedRows, data?.products?.edges]);

  useEffect(() => {
    if (data?.products?.edges) {
      const products = data.products.edges.map((edge: any) => edge.node);
      const total = products.length;
      const approved = products.filter((p: Product) => {
        const variant = p.variants.edges[0]?.node;
        return p.title && p.vendor && variant?.price && (variant?.sku || variant?.barcode) && p.images.edges[0]?.node.url;
      }).length;
      const invalid = products.filter((p: Product) => {
        const variant = p.variants.edges[0]?.node;
        return !p.title || !p.vendor || !variant?.price || (!variant?.sku && !variant?.barcode) || !p.images.edges[0]?.node.url;
      }).length;
      const rejected = total - approved - invalid;

      setAnalytics({
        totalProducts: total,
        approvedProducts: approved,
        rejectedProducts: rejected,
        invalidProducts: invalid,
      });
    }
  }, [data]);

  const handlePreview = async () => {
    try {
      const response = await fetch(feedUrl);
      const xml = await response.text();
      setPreviewXml(xml);
      setShowPreview(true);
    } catch (error) {
      console.error('Failed to fetch preview:', error);
    }
  };

  const handleSync = useCallback(async () => {
    try {
      // Refetch products and collections
      await Promise.all([
        client.refetchQueries({
          include: ['GetProducts', 'GetCollections'],
        }),
      ]);

      // Validate required fields
      const products = data?.products?.edges.map((edge: any) => edge.node) || [];
      const invalidProducts = products.filter((p: Product) => {
        const variant = p.variants.edges[0]?.node;
        return !p.title || !p.vendor || !variant?.price || (!variant?.sku && !variant?.barcode) || !p.images.edges[0]?.node.url;
      });

      if (invalidProducts.length > 0) {
        console.warn('Some products are missing required fields:', invalidProducts);
      }
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    }
  }, [client, data]);

  useEffect(() => {
    const syncFrequency = localStorage.getItem('syncFrequency') || 'daily';
    const lastSync = localStorage.getItem('lastSync');
    
    if (!lastSync) {
      // First time setup
      handleSync();
      return;
    }

    const lastSyncDate = new Date(lastSync);
    const now = new Date();
    let nextSync = new Date(lastSyncDate);

    switch (syncFrequency) {
      case 'hourly':
        nextSync.setHours(nextSync.getHours() + 1);
        break;
      case 'daily':
        nextSync.setDate(nextSync.getDate() + 1);
        break;
      case 'weekly':
        nextSync.setDate(nextSync.getDate() + 7);
        break;
    }

    if (now >= nextSync) {
      // Time to sync
      handleSync();
    } else {
      // Schedule next sync
      const timeout = nextSync.getTime() - now.getTime();
      const timer = setTimeout(() => {
        handleSync();
      }, timeout);

      return () => clearTimeout(timer);
    }
  }, [handleSync]);

  const rows = data?.products?.edges.map(({ node }: { node: Product }, index: number) => {
    const variant = node.variants.edges[0]?.node;
    const image = node.images.edges[0]?.node;
    return [
      <Checkbox
        key={node.id}
        label={node.title}
        checked={selectedRows.includes(index)}
        onChange={() => {
          const newSelectedRows = selectedRows.includes(index)
            ? selectedRows.filter((i) => i !== index)
            : [...selectedRows, index];
          setSelectedRows(newSelectedRows);
        }}
      />,
      variant ? `$${variant.price}` : "N/A",
      variant?.sku || "N/A",
      node.vendor || "N/A",
      image?.url ? <img src={image.url} alt={node.title} className="h-10 w-10 object-cover" /> : "N/A",
    ];
  }) || [];

  return (
    <div className="p-4">
      <div className="mb-4">
        <SyncSettings 
          onSync={handleSync} 
          feedUrl={feedUrl}
          analytics={analytics}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="collection" className="block text-sm font-medium text-gray-700 mb-2">
          Filter by Collection
        </label>
        <select
          id="collection"
          value={selectedCollection}
          onChange={(e) => {
            setSelectedCollection(e.target.value);
            setSelectedRows([]);
          }}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          <option value="all">All Collections</option>
          {collections.map((collection) => (
            <option key={collection.id} value={collection.id}>
              {collection.title}
            </option>
          ))}
        </select>
      </div>

      <Page
        title="Product Feed Manager"
        primaryAction={
          <div className="flex gap-2">
            <Button 
              onClick={() => {
                navigator.clipboard.writeText(feedUrl);
                setShowToast(true);
              }}
            >
              Copy Feed URL
            </Button>
            <Button
              onClick={handlePreview}
              disabled={!feedUrl}
            >
              Preview Feed
            </Button>
          </div>
        }
      >
        {loading && <Loading />}
        
        <Layout>
          <Layout.Section>
            <Card>
              <DataTable
                columnContentTypes={["text", "text", "text", "text", "text"]}
                headings={["Product", "Price", "SKU", "Brand", "Image"]}
                rows={rows}
                onSort={(index, direction) => console.log(index, direction)}
                sortable={[true, true, true, true, false]}
                defaultSortDirection="ascending"
                initialSortColumnIndex={0}
              />
            </Card>
          </Layout.Section>
          
          <Layout.Section>
            {error ? (
              <Banner tone="critical">
                <p>Error loading products: {error.message}</p>
              </Banner>
            ) : (
              <Banner tone="info">
                <p>Your feed URL is: {feedUrl}</p>
                <p>Use this URL in Google Merchant Center to sync your products.</p>
                {selectedRows.length > 0 && (
                  <p>Selected {selectedRows.length} products for the feed.</p>
                )}
              </Banner>
            )}
          </Layout.Section>

          {showPreview && (
            <Layout.Section>
              <Card>
                <div className="p-4">
                  <h3 className="text-lg font-medium mb-2">Feed Preview</h3>
                  <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
                    <code>{previewXml}</code>
                  </pre>
                </div>
              </Card>
            </Layout.Section>
          )}
        </Layout>

        {showToast && (
          <Toast
            content="Feed URL copied to clipboard"
            onDismiss={() => setShowToast(false)}
          />
        )}
      </Page>
    </div>
  );
}
