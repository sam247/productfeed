import { Card, Button, Text, Box } from "@shopify/polaris";
import { useState } from "react";
import { loadStripe } from '@stripe/stripe-js';
import { createPayment } from '@/utils/db';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentProcessorProps {
  tier: {
    name: string;
    price: number;
    productLimit: number;
    feedLimit: number;
    features: string[];
  };
  shopId: string;
  onSuccess: () => void;
}

export function PaymentProcessor({ tier, shopId, onSuccess }: PaymentProcessorProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    try {
      setIsProcessing(true);

      // Create payment record
      const payment = await createPayment(shopId, {
        amount: tier.price,
        currency: 'USD',
        tier: tier.name,
      });

      // Create Stripe checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentId: payment.id,
          amount: tier.price,
          tier: tier.name,
        }),
      });

      const { sessionId } = await response.json();
      const stripe = await stripePromise;

      if (!stripe) {
        throw new Error('Stripe failed to initialize');
      }

      // Redirect to Stripe checkout
      const { error } = await stripe.redirectToCheckout({
        sessionId,
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Payment failed:', error);
      // Handle error (show error message, etc.)
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <Box padding="400">
        <div className="space-y-4">
          <Text variant="headingMd" as="h3">Upgrade to {tier.name}</Text>
          <Text variant="headingXl" as="p" fontWeight="bold">
            ${tier.price}/month
          </Text>
          <ul className="space-y-2">
            {tier.features.map((feature) => (
              <li key={feature} className="flex items-center">
                <Text as="span">{feature}</Text>
              </li>
            ))}
          </ul>
          <Button
            tone="success"
            onClick={handlePayment}
            loading={isProcessing}
          >
            Upgrade Now
          </Button>
        </div>
      </Box>
    </Card>
  );
} 