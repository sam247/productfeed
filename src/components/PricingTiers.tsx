import { Card, Text, Box, Button } from "@shopify/polaris";

interface PricingTier {
  name: string;
  price: number;
  productLimit: number;
  feedLimit: number;
  features: string[];
}

const TIERS: PricingTier[] = [
  {
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
  },
  {
    name: "Professional",
    price: 29.99,
    productLimit: 1000,
    feedLimit: 3,
    features: [
      "3 product feeds",
      "Up to 1000 products",
      "Hourly updates",
      "Priority support"
    ]
  },
  {
    name: "Enterprise",
    price: 99.99,
    productLimit: 10000,
    feedLimit: 10,
    features: [
      "10 product feeds",
      "Up to 10,000 products",
      "Real-time updates",
      "24/7 support"
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