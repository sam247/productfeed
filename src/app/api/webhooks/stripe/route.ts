import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { updatePayment, updateShopTier } from '@/utils/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  try {
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const paymentId = session.metadata?.paymentId;
        const tier = session.metadata?.tier;

        if (paymentId && tier) {
          // Update payment status
          await updatePayment(paymentId, 'completed');

          // Update shop tier
          const shopId = session.metadata?.shopId;
          if (shopId) {
            await updateShopTier(shopId, tier);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const shopId = subscription.metadata?.shopId;

        if (shopId) {
          // Downgrade to free tier when subscription is cancelled
          await updateShopTier(shopId, 'Starter');
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook error' },
      { status: 400 }
    );
  }
} 