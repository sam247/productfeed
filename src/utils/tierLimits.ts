import { prisma } from './db';

interface FeedWithSettings {
  settings: {
    productIds?: string[];
  };
}

export interface TierLimits {
  productLimit: number;
  feedLimit: number;
  productsPerFeedLimit: number;
}

const TIER_LIMITS: Record<string, TierLimits> = {
  Basic: {
    productLimit: 1000,
    feedLimit: 2,
    productsPerFeedLimit: 1000
  },
  Professional: {
    productLimit: 5000,
    feedLimit: 5,
    productsPerFeedLimit: 2500
  },
  Advanced: {
    productLimit: 10000,
    feedLimit: 20,
    productsPerFeedLimit: 5000
  }
};

export async function checkTierLimits(shopId: string, productCount?: number, newFeed?: boolean): Promise<{ 
  allowed: boolean; 
  reason?: string;
  currentUsage: {
    products: number;
    feeds: number;
  };
  limits: TierLimits;
}> {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    include: {
      feeds: true,
    }
  });

  if (!shop) {
    throw new Error('Shop not found');
  }

  const limits = TIER_LIMITS[shop.tier] || TIER_LIMITS.Basic;
  const currentFeeds = shop.feeds.length;
  
  // Get current product count from feeds
  const currentProducts = shop.feeds.reduce((total: number, feed: FeedWithSettings) => {
    const settings = feed.settings as { productIds?: string[] };
    return total + (settings.productIds?.length || 0);
  }, 0);

  const checks = {
    allowed: true,
    reason: undefined,
    currentUsage: {
      products: currentProducts,
      feeds: currentFeeds
    },
    limits
  };

  // Check feed limit
  if (newFeed && currentFeeds >= limits.feedLimit) {
    return {
      ...checks,
      allowed: false,
      reason: `You've reached the maximum number of feeds (${limits.feedLimit}) for your ${shop.tier} plan.`
    };
  }

  // Check product limit
  if (productCount && (currentProducts + productCount) > limits.productLimit) {
    return {
      ...checks,
      allowed: false,
      reason: `Adding ${productCount} products would exceed your ${shop.tier} plan limit of ${limits.productLimit} products.`
    };
  }

  // Check products per feed limit
  if (productCount && productCount > limits.productsPerFeedLimit) {
    return {
      ...checks,
      allowed: false,
      reason: `The feed exceeds the ${limits.productsPerFeedLimit} products per feed limit for your ${shop.tier} plan.`
    };
  }

  return checks;
} 