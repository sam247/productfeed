import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getShop(shop: string) {
  return prisma.shop.findUnique({
    where: { shop },
    include: {
      feeds: true,
      payments: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });
}

export async function createShop(shop: string, accessToken: string) {
  return prisma.shop.create({
    data: {
      shop,
      accessToken,
      tier: 'Starter',
    },
  });
}

export async function updateShopTier(shop: string, tier: string) {
  return prisma.shop.update({
    where: { shop },
    data: { tier },
  });
}

export async function createFeed(shopId: string, data: {
  name: string;
  settings: any;
  url: string;
}) {
  return prisma.feed.create({
    data: {
      ...data,
      shopId,
    },
  });
}

export async function updateFeed(id: string, data: {
  name?: string;
  settings?: any;
  status?: string;
  lastSync?: Date;
}) {
  return prisma.feed.update({
    where: { id },
    data,
  });
}

export async function deleteFeed(id: string) {
  return prisma.feed.delete({
    where: { id },
  });
}

export async function createPayment(shopId: string, data: {
  amount: number;
  currency: string;
  tier: string;
}) {
  return prisma.payment.create({
    data: {
      ...data,
      shopId,
    },
  });
}

export async function updatePayment(id: string, status: string) {
  return prisma.payment.update({
    where: { id },
    data: { status },
  });
}

export default prisma; 