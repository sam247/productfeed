import { Card, Button, Text, Banner, Box, Select, TextField, ChoiceList, ProgressBar } from "@shopify/polaris";
import { useState, useEffect } from "react";
import { PricingTiers } from "./PricingTiers";

interface Feed {
  id: string;
  name: string;
  settings: {
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
  };
  url: string;
  lastSync: Date | null;
  status: 'active' | 'paused' | 'error';
}

interface PricingTier {
  name: string;
  price: number;
  productLimit: number;
  feedLimit: number;
  features: string[];
}

interface TierUsage {
  products: number;
  feeds: number;
  limits: {
    productLimit: number;
    feedLimit: number;
    productsPerFeedLimit: number;
  };
}

const DEFAULT_TIER: PricingTier = {
  name: "Starter",
  price: 9.99,
  productLimit: 100,
  feedLimit: 1,
  features: [
    "1 product feed",
    "Up to 100 products",
    "Daily updates",
    "Basic support"
  ]
};

const CURRENCIES = {
  GB: 'GBP',
  US: 'USD',
  EU: 'EUR',
  // Add more currencies
};

const LANGUAGES = {
  GB: 'en-GB',
  US: 'en-US',
  // Add more languages
};

export function FeedManager() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<TierUsage | null>(null);
  const [newFeed, setNewFeed] = useState<Partial<Feed>>({
    settings: {
      country: 'GB',
      language: 'en-GB',
      currency: 'GBP',
      format: 'XML',
      updateFrequency: 'daily',
      includeVariants: true,
      customAttributes: {},
      metafieldMappings: {},
    }
  });

  // Load feeds and usage on mount
  useEffect(() => {
    loadFeeds();
  }, []);

  const loadFeeds = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/feed');
      if (!response.ok) throw new Error('Failed to load feeds');
      const data = await response.json();
      setFeeds(data.feeds);
      setUsage(data.usage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feeds');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!newFeed.name || !newFeed.settings) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/feed/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newFeed.name,
          settings: newFeed.settings,
          shopId: 'current', // This will be handled by the API middleware
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create feed');
      }

      const feed = await response.json();
      setFeeds([...feeds, feed]);
      setIsCreating(false);
      setNewFeed({
        settings: {
          country: 'GB',
          language: 'en-GB',
          currency: 'GBP',
          format: 'XML',
          updateFrequency: 'daily',
          includeVariants: true,
          customAttributes: {},
          metafieldMappings: {},
        }
      });
      
      // Refresh usage data
      loadFeeds();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create feed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/feed/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete feed');
      }

      setFeeds(feeds.filter(feed => feed.id !== id));
      // Refresh usage data
      loadFeeds();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete feed');
    }
  };

  return (
    <div className="space-y-6">
      {usage && (
        <Card>
          <Box padding="400">
            <Text variant="headingMd" as="h2">Resource Usage</Text>
            <div className="space-y-4 mt-4">
              <div>
                <div className="flex justify-between mb-2">
                  <Text as="p">Feeds ({usage.feeds}/{usage.limits.feedLimit})</Text>
                  <Text as="p">{Math.round((usage.feeds / usage.limits.feedLimit) * 100)}%</Text>
                </div>
                <ProgressBar
                  progress={Math.min((usage.feeds / usage.limits.feedLimit) * 100, 100)}
                  tone={usage.feeds >= usage.limits.feedLimit ? "critical" : "highlight"}
                />
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <Text as="p">Products ({usage.products}/{usage.limits.productLimit})</Text>
                  <Text as="p">{Math.round((usage.products / usage.limits.productLimit) * 100)}%</Text>
                </div>
                <ProgressBar
                  progress={Math.min((usage.products / usage.limits.productLimit) * 100, 100)}
                  tone={usage.products >= usage.limits.productLimit ? "critical" : "highlight"}
                />
              </div>
            </div>
          </Box>
        </Card>
      )}

      <Card>
        <Box padding="400">
          <div className="flex justify-between items-center mb-4">
            <Text variant="headingMd" as="h2">Feed Management</Text>
            <Button 
              onClick={() => setIsCreating(true)}
              disabled={isLoading || (usage?.feeds || 0) >= (usage?.limits.feedLimit || 0)}
            >
              Create New Feed
            </Button>
          </div>

          {error && (
            <Banner tone="critical" onDismiss={() => setError(null)}>
              <p>{error}</p>
            </Banner>
          )}

          {feeds.length === 0 ? (
            <Banner tone="info">
              <p>No feeds configured yet. Create your first feed to get started.</p>
            </Banner>
          ) : (
            <div className="space-y-4">
              {feeds.map(feed => (
                <Card key={feed.id}>
                  <Box padding="400">
                    <div className="flex justify-between items-center">
                      <div>
                        <Text variant="headingSm" as="h3">{feed.name}</Text>
                        <Text variant="bodySm" as="p">
                          {feed.settings.country} • {feed.settings.language} • {feed.settings.currency}
                        </Text>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => window.open(feed.url, '_blank')}>
                          View Feed
                        </Button>
                        <Button tone="critical" onClick={() => handleDelete(feed.id)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  </Box>
                </Card>
              ))}
            </div>
          )}

          {isCreating && (
            <div className="mt-4 space-y-4">
              <TextField
                label="Feed Name"
                value={newFeed.name || ''}
                onChange={(value) => setNewFeed({ ...newFeed, name: value })}
                autoComplete="off"
              />
              
              <Select
                label="Country"
                options={[
                  { label: 'United Kingdom', value: 'GB' },
                  { label: 'United States', value: 'US' },
                  { label: 'European Union', value: 'EU' },
                ]}
                value={newFeed.settings?.country}
                onChange={(value) => setNewFeed({
                  ...newFeed,
                  settings: { 
                    ...newFeed.settings!,
                    country: value,
                    currency: value === 'GB' ? 'GBP' : value === 'US' ? 'USD' : 'EUR',
                    language: value === 'GB' ? 'en-GB' : value === 'US' ? 'en-US' : 'en-EU',
                  }
                })}
              />

              <Select
                label="Feed Format"
                options={[
                  { label: 'XML (Google Merchant Center)', value: 'XML' },
                  { label: 'CSV (Comma Separated)', value: 'CSV' },
                  { label: 'TSV (Tab Separated)', value: 'TSV' },
                ]}
                value={newFeed.settings?.format}
                onChange={(value) => setNewFeed({
                  ...newFeed,
                  settings: { ...newFeed.settings!, format: value as 'XML' | 'CSV' | 'TSV' }
                })}
              />

              <Select
                label="Update Frequency"
                options={[
                  { label: 'Hourly', value: 'hourly' },
                  { label: 'Daily', value: 'daily' },
                  { label: 'Weekly', value: 'weekly' },
                ]}
                value={newFeed.settings?.updateFrequency}
                onChange={(value) => setNewFeed({
                  ...newFeed,
                  settings: { ...newFeed.settings!, updateFrequency: value as 'hourly' | 'daily' | 'weekly' }
                })}
              />

              <ChoiceList
                title="Include Product Variants"
                choices={[
                  {
                    label: 'Include all variants as separate products',
                    value: 'true',
                  },
                  {
                    label: 'Only include main product',
                    value: 'false',
                  },
                ]}
                selected={[newFeed.settings?.includeVariants ? 'true' : 'false']}
                onChange={([value]) => setNewFeed({
                  ...newFeed,
                  settings: { ...newFeed.settings!, includeVariants: value === 'true' }
                })}
              />

              <div className="flex gap-2">
                <Button onClick={handleSave} loading={isLoading}>Save Feed</Button>
                <Button tone="critical" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Box>
      </Card>
    </div>
  );
} 