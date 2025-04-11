import { prisma } from '@/utils/db';
import { logInfo, logWarning, logError } from './logger';
import * as Sentry from '@sentry/nextjs';

export interface ScheduleConfig {
  frequency: 'hourly' | 'daily' | 'weekly';
  lastRun?: Date;
  nextRun?: Date;
  timeZone?: string;
  retryCount: number;
  maxRetries: number;
}

export class FeedScheduler {
  private static readonly MAX_CONCURRENT_FEEDS = 3;
  private static readonly DEFAULT_MAX_RETRIES = 3;
  private static readonly RETRY_DELAYS = [5, 15, 30]; // minutes

  static async shouldRunFeed(feedId: string): Promise<boolean> {
    const feed = await prisma.feed.findUnique({
      where: { id: feedId },
      select: {
        lastSync: true,
        settings: true,
        status: true,
      },
    });

    if (!feed || feed.status !== 'active') {
      return false;
    }

    const settings = feed.settings as any;
    const lastSync = feed.lastSync || new Date(0);
    const now = new Date();

    // Check if enough time has passed based on frequency
    const hoursSinceLastSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);
    
    switch (settings.updateFrequency) {
      case 'hourly':
        return hoursSinceLastSync >= 1;
      case 'daily':
        return hoursSinceLastSync >= 24;
      case 'weekly':
        return hoursSinceLastSync >= 168; // 7 days * 24 hours
      default:
        return false;
    }
  }

  static async getNextRunTime(feedId: string): Promise<Date | null> {
    const feed = await prisma.feed.findUnique({
      where: { id: feedId },
      select: {
        lastSync: true,
        settings: true,
      },
    });

    if (!feed) return null;

    const settings = feed.settings as any;
    const lastSync = feed.lastSync || new Date(0);
    const baseTime = new Date(lastSync);

    switch (settings.updateFrequency) {
      case 'hourly':
        baseTime.setHours(baseTime.getHours() + 1);
        break;
      case 'daily':
        baseTime.setDate(baseTime.getDate() + 1);
        break;
      case 'weekly':
        baseTime.setDate(baseTime.getDate() + 7);
        break;
      default:
        return null;
    }

    return baseTime;
  }

  static async handleFailedFeed(feedId: string, error: Error | string): Promise<void> {
    const feed = await prisma.feed.findUnique({
      where: { id: feedId },
      select: {
        settings: true,
        status: true,
      },
    });

    if (!feed) return;

    const settings = feed.settings as any;
    const retryCount = (settings.retryCount || 0) + 1;
    const maxRetries = settings.maxRetries || this.DEFAULT_MAX_RETRIES;
    const errorMessage = error instanceof Error ? error.message : error;

    if (retryCount <= maxRetries) {
      // Schedule retry with exponential backoff
      const delayMinutes = this.RETRY_DELAYS[retryCount - 1] || this.RETRY_DELAYS[this.RETRY_DELAYS.length - 1];
      const nextRetry = new Date(Date.now() + delayMinutes * 60 * 1000);

      await prisma.feed.update({
        where: { id: feedId },
        data: {
          settings: {
            ...settings,
            retryCount,
            nextRetry: nextRetry.toISOString(),
          },
        },
      });

      logWarning('Feed generation failed, scheduled retry', {
        feedId,
        retryCount,
        nextRetry,
        error: errorMessage,
      });

      Sentry.captureException(error instanceof Error ? error : new Error(errorMessage), {
        tags: {
          feedId,
          retryCount: retryCount.toString(),
        },
        extra: {
          nextRetry,
        },
      });
    } else {
      // Mark feed as failed after max retries
      await prisma.feed.update({
        where: { id: feedId },
        data: {
          status: 'failed',
          settings: {
            ...settings,
            lastError: errorMessage,
            failedAt: new Date().toISOString(),
          },
        },
      });

      logError('Feed generation failed permanently', {
        feedId,
        error: errorMessage,
      });

      Sentry.captureException(error instanceof Error ? error : new Error(errorMessage), {
        tags: {
          feedId,
          status: 'failed_permanently',
        },
      });
    }
  }

  static async getConcurrentFeedsCount(): Promise<number> {
    const runningFeeds = await prisma.feed.count({
      where: {
        status: 'processing',
      },
    });
    return runningFeeds;
  }

  static async canStartNewFeed(): Promise<boolean> {
    const concurrentFeeds = await this.getConcurrentFeedsCount();
    return concurrentFeeds < this.MAX_CONCURRENT_FEEDS;
  }

  static async resetRetryCount(feedId: string): Promise<void> {
    const feed = await prisma.feed.findUnique({
      where: { id: feedId },
      select: {
        settings: true,
      },
    });

    if (!feed) return;

    const settings = feed.settings as any;
    
    await prisma.feed.update({
      where: { id: feedId },
      data: {
        settings: {
          ...settings,
          retryCount: 0,
          nextRetry: null,
          lastError: null,
        },
      },
    });
  }
} 