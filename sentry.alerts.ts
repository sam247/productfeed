// These rules need to be configured in your Sentry dashboard
// This file serves as documentation for the alert rules

export const alertRules = {
  // Feed Generation Errors
  feedGenerationErrors: {
    name: 'Feed Generation Errors',
    description: 'Alert when feed generation has errors',
    conditions: [
      {
        type: 'event',
        filter: {
          level: 'warning',
          message: 'Feed generation completed with errors',
        },
        frequency: '10 events in 1 hour',
      },
    ],
    actions: ['email', 'slack'],
  },

  // High Product Failure Rate
  highProductFailureRate: {
    name: 'High Product Failure Rate',
    description: 'Alert when product processing failure rate exceeds threshold',
    conditions: [
      {
        type: 'metric',
        filter: {
          metric: 'feed.metrics.failureRate',
          threshold: '> 0.1', // 10% failure rate
        },
        frequency: 'sustained for 5 minutes',
      },
    ],
    actions: ['email', 'slack'],
  },

  // Feed Generation Performance
  slowFeedGeneration: {
    name: 'Slow Feed Generation',
    description: 'Alert when feed generation is slower than expected',
    conditions: [
      {
        type: 'metric',
        filter: {
          metric: 'feed.metrics.productsPerSecond',
          threshold: '< 10', // Less than 10 products per second
        },
        frequency: 'sustained for 5 minutes',
      },
    ],
    actions: ['email', 'slack'],
  },

  // API Response Time
  highApiLatency: {
    name: 'High API Latency',
    description: 'Alert when API response time is too high',
    conditions: [
      {
        type: 'metric',
        filter: {
          metric: 'response.duration',
          threshold: '> 1000', // More than 1 second
        },
        frequency: '90th percentile over 5 minutes',
      },
    ],
    actions: ['email', 'slack'],
  },

  // Error Rate
  highErrorRate: {
    name: 'High Error Rate',
    description: 'Alert when error rate exceeds threshold',
    conditions: [
      {
        type: 'metric',
        filter: {
          metric: 'error.rate',
          threshold: '> 0.05', // 5% error rate
        },
        frequency: 'sustained for 5 minutes',
      },
    ],
    actions: ['email', 'slack'],
  },

  // Memory Usage
  highMemoryUsage: {
    name: 'High Memory Usage',
    description: 'Alert when memory usage is too high',
    conditions: [
      {
        type: 'metric',
        filter: {
          metric: 'memory.usage',
          threshold: '> 80', // 80% memory usage
        },
        frequency: 'sustained for 5 minutes',
      },
    ],
    actions: ['email', 'slack'],
  },

  // Feed Health
  feedHealthDegraded: {
    name: 'Feed Health Degraded',
    description: 'Alert when feed health status is degraded or failed',
    conditions: [
      {
        type: 'event',
        filter: {
          metric: 'feed.health',
          value: ['degraded', 'failed'],
        },
        frequency: 'any occurrence',
      },
    ],
    actions: ['email', 'slack'],
  },

  // Batch Processing Performance
  batchProcessingDelay: {
    name: 'Batch Processing Delay',
    description: 'Alert when batch processing time exceeds threshold',
    conditions: [
      {
        type: 'metric',
        filter: {
          metric: 'batch.duration',
          threshold: '> 30000', // 30 seconds per batch
        },
        frequency: '3 occurrences in 15 minutes',
      },
    ],
    actions: ['email', 'slack'],
    severity: 'warning',
  },

  // API Error Spikes
  apiErrorSpike: {
    name: 'API Error Spike',
    description: 'Alert when there is a sudden increase in API errors',
    conditions: [
      {
        type: 'metric',
        filter: {
          metric: 'api.error.count',
          threshold: '> 50% increase',
        },
        frequency: 'over 5 minute period compared to previous 5 minutes',
      },
    ],
    actions: ['email', 'slack'],
    severity: 'error',
  },

  // Feed Size Anomaly
  feedSizeAnomaly: {
    name: 'Feed Size Anomaly',
    description: 'Alert when feed size varies significantly from historical average',
    conditions: [
      {
        type: 'metric',
        filter: {
          metric: 'feed.totalProducts',
          threshold: '+/- 30% from 24h average',
        },
        frequency: 'any occurrence',
      },
    ],
    actions: ['email', 'slack'],
    severity: 'warning',
  },

  // Concurrent Feed Generation Load
  highConcurrentFeeds: {
    name: 'High Concurrent Feed Generation',
    description: 'Alert when too many feeds are being generated simultaneously',
    conditions: [
      {
        type: 'metric',
        filter: {
          metric: 'active.feeds.count',
          threshold: '> 5', // More than 5 concurrent feed generations
        },
        frequency: 'sustained for 2 minutes',
      },
    ],
    actions: ['email', 'slack'],
    severity: 'warning',
  },

  // Database Connection Issues
  databaseConnectionIssues: {
    name: 'Database Connection Issues',
    description: 'Alert on database connection problems',
    conditions: [
      {
        type: 'event',
        filter: {
          category: 'database',
          level: 'error',
        },
        frequency: '3 events in 5 minutes',
      },
    ],
    actions: ['email', 'slack'],
    severity: 'critical',
  },

  // Rate Limit Approaching
  rateLimitApproaching: {
    name: 'Shopify API Rate Limit Approaching',
    description: 'Alert when approaching Shopify API rate limits',
    conditions: [
      {
        type: 'metric',
        filter: {
          metric: 'shopify.api.rateLimit.remaining',
          threshold: '< 10%',
        },
        frequency: 'sustained for 1 minute',
      },
    ],
    actions: ['email', 'slack'],
    severity: 'warning',
  }
};

/*
To set up these alerts in Sentry:
1. Go to sentry.io
2. Navigate to Alerts > Create Alert Rule
3. Select the appropriate metric or event
4. Configure the conditions as specified above
5. Set up notification actions (email, Slack, etc.)
6. Save and enable the alert rule

Additional Monitoring Tips:
1. Set up a Slack channel specifically for alerts
2. Configure different severity levels for different alerts:
   - Critical: Requires immediate attention (system down, data loss risk)
   - Error: Serious issues requiring attention within hours
   - Warning: Issues that need attention but aren't immediate
   - Info: Notable events that don't require immediate action
3. Set up on-call schedules for critical alerts
4. Review and adjust thresholds based on actual usage patterns
5. Set up dashboards to visualize these metrics
6. Implement alert grouping to prevent alert fatigue
7. Create runbooks for each alert type with:
   - Description of what triggered the alert
   - Potential causes
   - Step-by-step troubleshooting guide
   - Escalation procedures
8. Schedule regular reviews of alert effectiveness
9. Set up alert correlation to identify related issues
10. Maintain historical alert data for trend analysis

Alert Management Best Practices:
1. Use alert suppression during maintenance windows
2. Implement alert deduplication to prevent noise
3. Set up different notification channels based on severity
4. Create alert dependencies to prevent cascade notifications
5. Document all false positives and tune alerts accordingly
6. Regularly validate alert configurations
7. Maintain an alert changelog for tracking modifications
*/ 