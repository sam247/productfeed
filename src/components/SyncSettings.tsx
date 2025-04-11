import { Card, Button, Text, Banner, Box, Select } from "@shopify/polaris";
import { useState, useEffect } from "react";

interface SyncSettingsProps {
  onSync: () => Promise<void>;
  feedUrl: string;
  analytics: {
    totalProducts: number;
    approvedProducts: number;
    rejectedProducts: number;
    invalidProducts: number;
  };
}

export function SyncSettings({ onSync, feedUrl, analytics }: SyncSettingsProps) {
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [nextSync, setNextSync] = useState<Date | null>(null);
  const [syncFrequency, setSyncFrequency] = useState('daily');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Load last sync time and frequency from localStorage
    const savedLastSync = localStorage.getItem('lastSync');
    const savedFrequency = localStorage.getItem('syncFrequency');
    if (savedLastSync) {
      setLastSync(new Date(savedLastSync));
    }
    if (savedFrequency) {
      setSyncFrequency(savedFrequency);
    }

    // Calculate next sync based on frequency
    if (lastSync) {
      const next = new Date(lastSync);
      switch (syncFrequency) {
        case 'hourly':
          next.setHours(next.getHours() + 1);
          break;
        case 'daily':
          next.setDate(next.getDate() + 1);
          break;
        case 'weekly':
          next.setDate(next.getDate() + 7);
          break;
      }
      setNextSync(next);
    }
  }, [lastSync, syncFrequency]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await onSync();
      const now = new Date();
      setLastSync(now);
      localStorage.setItem('lastSync', now.toISOString());
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFrequencyChange = (value: string) => {
    setSyncFrequency(value);
    localStorage.setItem('syncFrequency', value);
  };

  return (
    <Card>
      <Box>
        <div className="p-5">
          <Text variant="headingMd" as="h2">Feed Info & Sync</Text>
          <div className="mt-4">
            <div className="flex justify-between items-center">
              <Text as="p">
                Last sync: {lastSync ? lastSync.toLocaleString() : 'Never'}
              </Text>
              <Button
                onClick={handleSync}
                loading={isSyncing}
                tone="success"
              >
                Sync Now
              </Button>
            </div>

            {nextSync && (
              <div className="mt-4">
                <Text as="p">
                  Next sync: {nextSync.toLocaleString()}
                </Text>
              </div>
            )}

            <div className="mt-4">
              <Select
                label="Sync Frequency"
                options={[
                  { label: 'Hourly', value: 'hourly' },
                  { label: 'Daily', value: 'daily' },
                  { label: 'Weekly', value: 'weekly' },
                ]}
                value={syncFrequency}
                onChange={handleFrequencyChange}
              />
            </div>

            <div className="mt-4">
              <Banner tone="info">
                <p>All product updates will sync at the next scheduled time.</p>
                <p>Use Sync Now for immediate updates.</p>
              </Banner>
            </div>
          </div>
        </div>
      </Box>

      <Box>
        <div className="p-5 border-t">
          <Text variant="headingMd" as="h2">Feed Analytics</Text>
          <div className="mt-4">
            <Text as="p">
              Feed URL: {feedUrl}
            </Text>
            <div className="mt-4">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Text variant="headingSm" as="h3">Total Products</Text>
                  <Text as="p">{analytics.totalProducts}</Text>
                </div>
                <div>
                  <Text variant="headingSm" as="h3">Approved</Text>
                  <Text as="p" tone="success">{analytics.approvedProducts}</Text>
                </div>
                <div>
                  <Text variant="headingSm" as="h3">Rejected</Text>
                  <Text as="p" tone="critical">{analytics.rejectedProducts}</Text>
                </div>
                <div>
                  <Text variant="headingSm" as="h3">Invalid</Text>
                  <Text as="p" tone="caution">{analytics.invalidProducts}</Text>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Box>
    </Card>
  );
} 