import { logInfo, logWarning, logError } from './logger';
import * as Sentry from '@sentry/nextjs';

interface FeedMetrics {
  totalProducts: number;
  processedProducts: number;
  failedProducts: number;
  startTime: number;
  feedId: string;
  shopId: string;
  format: string;
}

class FeedMonitor {
  private metrics: FeedMetrics;
  private checkpointTime: number;
  private readonly BATCH_SIZE = 100;
  private productBatch: number = 0;

  constructor(feedId: string, shopId: string, totalProducts: number, format: string) {
    this.metrics = {
      totalProducts,
      processedProducts: 0,
      failedProducts: 0,
      startTime: Date.now(),
      feedId,
      shopId,
      format,
    };
    this.checkpointTime = Date.now();

    // Start monitoring
    this.logStart();

    // Track feed generation in Sentry
    Sentry.addBreadcrumb({
      category: 'feed',
      message: 'Feed generation started',
      level: 'info',
      data: {
        feedId,
        shopId,
        totalProducts,
        format,
      },
    });
  }

  private logStart() {
    logInfo('Feed generation started', {
      feedId: this.metrics.feedId,
      shopId: this.metrics.shopId,
      totalProducts: this.metrics.totalProducts,
      format: this.metrics.format,
    });
  }

  productProcessed(success: boolean, productId: string, error?: Error) {
    this.metrics.processedProducts++;
    if (!success) {
      this.metrics.failedProducts++;
      
      // Log warning and track in Sentry
      const warning = {
        feedId: this.metrics.feedId,
        productId,
        error: error?.message,
      };
      
      logWarning('Product processing failed', warning);
      
      Sentry.addBreadcrumb({
        category: 'product',
        message: 'Product processing failed',
        level: 'warning',
        data: warning,
      });

      if (error) {
        Sentry.captureException(error, {
          tags: {
            feedId: this.metrics.feedId,
            productId,
          },
        });
      }
    }

    // Log batch progress
    this.productBatch++;
    if (this.productBatch >= this.BATCH_SIZE) {
      this.logBatchProgress();
      this.productBatch = 0;
    }
  }

  private logBatchProgress() {
    const currentTime = Date.now();
    const batchDuration = currentTime - this.checkpointTime;
    const productsPerSecond = this.BATCH_SIZE / (batchDuration / 1000);
    const progress = (this.metrics.processedProducts / this.metrics.totalProducts) * 100;

    const batchMetrics = {
      feedId: this.metrics.feedId,
      batchSize: this.BATCH_SIZE,
      duration: batchDuration,
      productsPerSecond: productsPerSecond.toFixed(2),
      progress: progress.toFixed(2) + '%',
      failedProducts: this.metrics.failedProducts,
    };

    logInfo('Batch processed', batchMetrics);

    // Track batch performance in Sentry
    Sentry.addBreadcrumb({
      category: 'performance',
      message: 'Batch processed',
      level: 'info',
      data: batchMetrics,
    });

    this.checkpointTime = currentTime;
  }

  complete() {
    const duration = Date.now() - this.metrics.startTime;
    const success = this.metrics.failedProducts === 0;

    const finalMetrics = {
      feedId: this.metrics.feedId,
      duration,
      totalProducts: this.metrics.totalProducts,
      processedProducts: this.metrics.processedProducts,
      failedProducts: this.metrics.failedProducts,
      productsPerSecond: (this.metrics.processedProducts / (duration / 1000)).toFixed(2),
      success,
    };

    if (success) {
      logInfo('Feed generation completed successfully', finalMetrics);
    } else {
      logWarning('Feed generation completed with errors', finalMetrics);
    }

    // Track completion in Sentry
    Sentry.setTag('feed.success', success);
    Sentry.setTag('feed.format', this.metrics.format);
    Sentry.setContext('feed.metrics', finalMetrics);

    // If there were failures, capture an issue
    if (!success) {
      Sentry.captureMessage('Feed generation completed with errors', {
        level: 'warning',
        tags: {
          feedId: this.metrics.feedId,
          format: this.metrics.format,
        },
        contexts: {
          metrics: finalMetrics,
        },
      });
    }

    return finalMetrics;
  }

  getFeedHealth(): 'healthy' | 'degraded' | 'failed' {
    const failureRate = this.metrics.failedProducts / this.metrics.processedProducts;
    if (failureRate === 0) return 'healthy';
    if (failureRate < 0.1) return 'degraded';
    return 'failed';
  }

  updateTotalProducts(total: number) {
    this.metrics.totalProducts = total;
    logInfo('Updated total products count', {
      feedId: this.metrics.feedId,
      totalProducts: total
    });
  }

  updateProgress(progress: number) {
    const currentProgress = Math.min(100, Math.max(0, progress));
    logInfo('Feed generation progress', {
      feedId: this.metrics.feedId,
      progress: `${currentProgress.toFixed(2)}%`
    });

    // Track progress in Sentry
    Sentry.addBreadcrumb({
      category: 'progress',
      message: 'Feed generation progress',
      level: 'info',
      data: {
        feedId: this.metrics.feedId,
        progress: currentProgress
      }
    });
  }
}

export default FeedMonitor; 