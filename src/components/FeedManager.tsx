import { Card, Button, Text, Banner, Box, Select, TextField, ChoiceList } from "@shopify/polaris";
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
  const [currentTier, setCurrentTier] = useState<PricingTier>(DEFAULT_TIER);
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

  useEffect(() => {
    // Load current tier from localStorage or API
    const savedTier = localStorage.getItem('currentTier');
    if (savedTier) {
      setCurrentTier(JSON.parse(savedTier));
    }
  }, []);

  const handleSave = async () => {
    if (!newFeed.name || !newFeed.settings) return;

    // Check feed limit
    if (feeds.length >= currentTier.feedLimit) {
      alert(`You've reached the limit of ${currentTier.feedLimit} feeds for your current plan.`);
      return;
    }

    try {
      const feed: Feed = {
        id: crypto.randomUUID(),
        name: newFeed.name,
        settings: newFeed.settings as Feed['settings'],
        url: `/api/feed/${crypto.randomUUID()}`,
        lastSync: null,
        status: 'active',
      };

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
    } catch (error) {
      console.error('Failed to create feed:', error);
    }
  };

  const handleDelete = (id: string) => {
    setFeeds(feeds.filter(feed => feed.id !== id));
  };

  const handleTierSelect = (tier: PricingTier) => {
    setCurrentTier(tier);
    localStorage.setItem('currentTier', JSON.stringify(tier));
  };

  return (
    <div className="space-y-6">
      <PricingTiers 
        currentTier={currentTier.name}
        onSelectTier={handleTierSelect}
      />

      <Card>
        <Box padding="400">
          <div className="flex justify-between items-center mb-4">
            <Text variant="headingMd" as="h2">Feed Management</Text>
            <Button 
              onClick={() => setIsCreating(true)}
              disabled={feeds.length >= currentTier.feedLimit}
            >
              Create New Feed
            </Button>
          </div>

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
                <Button onClick={handleSave}>Save Feed</Button>
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