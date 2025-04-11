import { prisma } from '@/utils/db';
import { logInfo, logWarning, logError } from './logger';
import * as Sentry from '@sentry/nextjs';

export interface VersionStats {
  totalProducts: number;
  validProducts: number;
  invalidProducts: number;
  errors: any[];
  warnings: any[];
}

export class FeedVersionManager {
  private static readonly MAX_VERSIONS_TO_KEEP = 5;

  static async createVersion(
    feedId: string,
    content: string,
    format: string,
    stats: VersionStats,
    note?: string
  ) {
    try {
      // Get the latest version number
      const latestVersion = await prisma.feedVersion.findFirst({
        where: { feedId },
        orderBy: { version: 'desc' },
        select: { version: true },
      });

      const newVersion = (latestVersion?.version || 0) + 1;

      // Create new version
      const version = await prisma.feedVersion.create({
        data: {
          feedId,
          version: newVersion,
          content,
          format,
          stats,
          note,
          createdBy: 'system',
          status: 'active',
        },
      });

      // Archive old versions if needed
      await this.cleanupOldVersions(feedId);

      logInfo('Created new feed version', {
        feedId,
        versionId: version.id,
        version: newVersion,
      });

      return version;
    } catch (error) {
      logError('Failed to create feed version', {
        feedId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  static async rollback(feedId: string, toVersionId: string) {
    try {
      // Get the version to roll back to
      const targetVersion = await prisma.feedVersion.findUnique({
        where: { id: toVersionId },
        include: {
          feed: true,
        },
      });

      if (!targetVersion) {
        throw new Error('Target version not found');
      }

      // Create new version from the target version
      const newVersion = await this.createVersion(
        feedId,
        targetVersion.content,
        targetVersion.format,
        targetVersion.stats as VersionStats,
        `Rolled back from version ${targetVersion.version}`
      );

      // Update the new version with rollback info
      await prisma.feedVersion.update({
        where: { id: newVersion.id },
        data: {
          rollbackFrom: toVersionId,
          note: `Rolled back from version ${targetVersion.version}`,
        },
      });

      // Update feed settings with restored content
      await prisma.feed.update({
        where: { id: feedId },
        data: {
          settings: {
            ...targetVersion.feed.settings,
            lastContent: targetVersion.content,
          },
        },
      });

      logInfo('Successfully rolled back feed', {
        feedId,
        fromVersion: targetVersion.version,
        toVersion: newVersion.version,
      });

      return newVersion;
    } catch (error) {
      logError('Failed to roll back feed', {
        feedId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  static async getVersionHistory(feedId: string) {
    return prisma.feedVersion.findMany({
      where: { feedId },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        version: true,
        format: true,
        stats: true,
        status: true,
        createdAt: true,
        createdBy: true,
        rollbackFrom: true,
        note: true,
      },
    });
  }

  private static async cleanupOldVersions(feedId: string) {
    try {
      // Get all versions except the most recent ones
      const versions = await prisma.feedVersion.findMany({
        where: { feedId },
        orderBy: { version: 'desc' },
        skip: this.MAX_VERSIONS_TO_KEEP,
      });

      if (versions.length === 0) return;

      // Archive old versions
      await prisma.feedVersion.updateMany({
        where: {
          id: {
            in: versions.map(v => v.id),
          },
        },
        data: {
          status: 'archived',
        },
      });

      logInfo('Archived old feed versions', {
        feedId,
        archivedCount: versions.length,
      });
    } catch (error) {
      logWarning('Failed to cleanup old versions', {
        feedId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't throw error as this is a non-critical operation
    }
  }

  static async compareVersions(versionId1: string, versionId2: string) {
    const [v1, v2] = await Promise.all([
      prisma.feedVersion.findUnique({ where: { id: versionId1 } }),
      prisma.feedVersion.findUnique({ where: { id: versionId2 } }),
    ]);

    if (!v1 || !v2) {
      throw new Error('One or both versions not found');
    }

    const stats1 = v1.stats as VersionStats;
    const stats2 = v2.stats as VersionStats;

    return {
      productDiff: {
        total: stats2.totalProducts - stats1.totalProducts,
        valid: stats2.validProducts - stats1.validProducts,
        invalid: stats2.invalidProducts - stats1.invalidProducts,
      },
      errorDiff: {
        added: stats2.errors.filter(e => !stats1.errors.some(e1 => e1.field === e.field)),
        removed: stats1.errors.filter(e => !stats2.errors.some(e2 => e2.field === e.field)),
      },
      warningDiff: {
        added: stats2.warnings.filter(w => !stats1.warnings.some(w1 => w1.field === w.field)),
        removed: stats1.warnings.filter(w => !stats2.warnings.some(w2 => w2.field === w.field)),
      },
      timeGap: v2.createdAt.getTime() - v1.createdAt.getTime(),
    };
  }
} 