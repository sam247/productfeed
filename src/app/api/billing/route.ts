import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { tier, shop, returnUrl } = await request.json();
    
    let amount = 6.99; // Basic tier default
    if (tier === 'Professional') {
      amount = 14.99;
    } else if (tier === 'Advanced') {
      amount = 25.99;
    }

    const response = await fetch(`https://${shop}/admin/api/2024-01/recurring_application_charges.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN!
      },
      body: JSON.stringify({
        recurring_application_charge: {
          name: `${tier} Plan`,
          price: amount,
          return_url: returnUrl,
          test: process.env.NODE_ENV !== 'production'
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errors?.[0] || 'Failed to create subscription');
    }

    const result = await response.json();
    
    return NextResponse.json({
      confirmationUrl: result.recurring_application_charge.confirmation_url,
      subscriptionId: result.recurring_application_charge.id.toString()
    });

  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
} 