import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'productfeed' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    // Add file transport in production
    ...(process.env.NODE_ENV === 'production'
      ? [
          new winston.transports.File({ filename: 'error.log', level: 'error' }),
          new winston.transports.File({ filename: 'combined.log' }),
        ]
      : []),
  ],
});

// Create a stream for Morgan middleware
export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

export const logError = (error: Error, context = {}) => {
  logger.error({
    message: error.message,
    stack: error.stack,
    ...context,
  });
};

export const logInfo = (message: string, context = {}) => {
  logger.info({
    message,
    ...context,
  });
};

export const logWarning = (message: string, context = {}) => {
  logger.warn({
    message,
    ...context,
  });
};

export const logDebug = (message: string, context = {}) => {
  logger.debug({
    message,
    ...context,
  });
};

export default logger; 