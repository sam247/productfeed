import { Card, Text, Box, Button } from "@shopify/polaris";

interface PricingTier {
  name: string;
  price: number;
  productLimit: number;
  feedLimit: number;
  productsPerFeedLimit: number;
  features: string[];
}

const TIERS: PricingTier[] = [
  {
    name: "Basic",
    price: 6.99,
    productLimit: 1000,
    feedLimit: 2,
    productsPerFeedLimit: 1000,
    features: [
      "Up to 1,000 total products",
      "Up to 2 XML feeds",
      "Max 1,000 products per feed",
      "Daily updates",
      "Basic support"
    ]
  },
  {
    name: "Professional",
    price: 14.99,
    productLimit: 5000,
    feedLimit: 5,
    productsPerFeedLimit: 2500,
    features: [
      "Up to 5,000 total products",
      "Up to 5 XML feeds",
      "Max 2,500 products per feed",
      "Hourly updates",
      "Priority support",
      "Advanced feed customization"
    ]
  },
  {
    name: "Advanced",
    price: 25.99,
    productLimit: 10000,
    feedLimit: 20,
    productsPerFeedLimit: 5000,
    features: [
      "Up to 10,000 total products",
      "Up to 20 XML feeds",
      "Max 5,000 products per feed",
      "Real-time updates",
      "24/7 priority support",
      "Advanced feed customization",
      "Custom attribute mapping"
    ]
  }
];

interface PricingTiersProps {
  currentTier?: string;
  onSelectTier: (tier: PricingTier) => void;
}

export function PricingTiers({ currentTier, onSelectTier }: PricingTiersProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {TIERS.map((tier) => (
        <Card key={tier.name}>
          <Box padding="400">
            <Text variant="headingMd" as="h3">{tier.name}</Text>
            <Text variant="headingXl" as="p" fontWeight="bold">
              ${tier.price}/month
            </Text>
            <ul className="mt-4 space-y-2">
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-center">
                  <Text as="span">{feature}</Text>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <Button
                tone={currentTier === tier.name ? "success" : undefined}
                onClick={() => onSelectTier(tier)}
              >
                {currentTier === tier.name ? "Current Plan" : "Select Plan"}
              </Button>
            </div>
          </Box>
        </Card>
      ))}
    </div>
  );
} 