import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe with keepalive settings
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil',
  timeout: 20000, // Set timeout to 20 seconds
  maxNetworkRetries: 2, // Allow 2 retries
  httpAgent: new (require('http').Agent)({ keepAlive: true }), // Enable keepalive
});

export async function GET(request: Request) {
  try {
    // Test basic connection first
    const testConnection = await stripe.customers.list({ limit: 1 });
    console.log('Connection test successful');

    // Test creating a customer
    const customer = await stripe.customers.create({
      email: 'test@example.com',
      name: 'Test Customer',
    });
    console.log('Customer created:', customer.id);

    // Test creating a product
    const product = await stripe.products.create({
      name: 'Test Product',
      description: 'Test Description',
    });
    console.log('Product created:', product.id);

    // Test creating a price
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: 1000, // $10.00
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
    });
    console.log('Price created:', price.id);

    // Test creating a subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      payment_behavior: 'default_incomplete', // Add this to prevent immediate payment requirement
      metadata: {
        test: 'true',
      },
    });
    console.log('Subscription created:', subscription.id);

    // Test creating a payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 1000,
      currency: 'usd',
      customer: customer.id,
      payment_method_types: ['card'],
      metadata: {
        test: 'true',
      },
    });
    console.log('Payment intent created:', paymentIntent.id);

    return NextResponse.json({
      success: true,
      customer: customer.id,
      product: product.id,
      price: price.id,
      subscription: subscription.id,
      paymentIntent: paymentIntent.id,
    });
  } catch (error: any) {
    console.error('Stripe test failed:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Stripe test failed',
        code: error.code,
        type: error.type,
        requestId: error.requestId
      },
      { status: 500 }
    );
  }
} 