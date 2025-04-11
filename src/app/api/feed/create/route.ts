import { NextResponse } from 'next/server';
import { prisma } from '@/utils/db';
import { checkTierLimits } from '@/utils/tierLimits';

export async function POST(request: Request) {
  try {
    const { name, settings, shopId } = await request.json();

    // Check tier limits
    const tierCheck = await checkTierLimits(
      shopId,
      settings.productIds?.length || 0,
      true // new feed
    );

    if (!tierCheck.allowed) {
      return NextResponse.json(
        { error: tierCheck.reason },
        { status: 403 }
      );
    }

    // Create feed
    const feed = await prisma.feed.create({
      data: {
        name,
        settings,
        url: `/api/feed/${crypto.randomUUID()}`,
        shopId,
      },
    });

    return NextResponse.json(feed);
  } catch (error) {
    console.error('Failed to create feed:', error);
    return NextResponse.json(
      { error: 'Failed to create feed' },
      { status: 500 }
    );
  }
} 