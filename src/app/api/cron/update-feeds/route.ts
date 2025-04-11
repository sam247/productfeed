import { NextResponse } from 'next/server';
import { prisma } from '@/utils/db';
import { FeedScheduler } from '@/utils/feedScheduler';
import { logInfo, logError } from '@/utils/logger';
import * as Sentry from '@sentry/nextjs';

// Vercel cron runs every minute, but we'll check based on feed frequency
export async function GET(request: Request) {
  try {
    // Verify cron secret if set
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all active feeds
    const feeds = await prisma.feed.findMany({
      where: {
        status: 'active',
      },
      include: {
        shop: true,
      },
    });

    const results = [];
    const now = new Date();

    for (const feed of feeds) {
      try {
        // Check if feed should run based on its schedule
        const shouldRun = await FeedScheduler.shouldRunFeed(feed.id);
        if (!shouldRun) continue;

        // Check if we can start a new feed (concurrency limit)
        const canStart = await FeedScheduler.canStartNewFeed();
        if (!canStart) {
          logInfo('Skipping feed due to concurrency limit', { feedId: feed.id });
          continue;
        }

        // Update feed status to processing
        await prisma.feed.update({
          where: { id: feed.id },
          data: {
            status: 'processing',
          },
        });

        // Trigger feed generation
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/feed/${feed.id}`, {
          headers: {
            'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Feed generation failed: ${response.statusText}`);
        }

        // Reset retry count on successful generation
        await FeedScheduler.resetRetryCount(feed.id);

        // Update feed status back to active
        await prisma.feed.update({
          where: { id: feed.id },
          data: {
            status: 'active',
          },
        });

        results.push({
          feedId: feed.id,
          status: 'success',
        });
      } catch (error: any) {
        // Handle feed failure and retry logic
        await FeedScheduler.handleFailedFeed(feed.id, new Error(error.message));

        results.push({
          feedId: feed.id,
          status: 'error',
          error: error.message || 'Unknown error',
        });
      }
    }

    return NextResponse.json({ 
      timestamp: now.toISOString(),
      results 
    });
  } catch (error: any) {
    logError('Cron job failed', { error: error.message });
    
    Sentry.captureException(error, {
      tags: {
        job: 'update-feeds',
      },
    });

    return NextResponse.json(
      { error: error.message || 'Cron job failed' },
      { status: 500 }
    );
  }
} 