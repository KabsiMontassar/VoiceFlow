import pino from 'pino';
import config from '../config/index';

const isDev = config.NODE_ENV === 'development';

const baseLogger = pino(
  isDev
    ? {
        level: config.LOG_LEVEL,
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }
    : {
        level: config.LOG_LEVEL,
      },
);

// Export the base logger with type-safe wrapper methods
export const logger = {
  ...baseLogger,
  
  // Override error method to handle error objects properly
  error(msgOrObj: string | object, error?: unknown): void {
    if (typeof msgOrObj === 'string' && error) {
      baseLogger.error({ err: error }, msgOrObj);
    } else if (typeof msgOrObj === 'string') {
      baseLogger.error(msgOrObj);
    } else {
      baseLogger.error(msgOrObj);
    }
  },
  
  // Override debug method to handle objects properly
  debug(msgOrObj: string | object, data?: unknown): void {
    if (typeof msgOrObj === 'string' && data) {
      baseLogger.debug(data as object, msgOrObj);
    } else if (typeof msgOrObj === 'string') {
      baseLogger.debug(msgOrObj);
    } else {
      baseLogger.debug(msgOrObj);
    }
  },
  
  // Override warn method to handle objects properly
  warn(msgOrObj: string | object, data?: unknown): void {
    if (typeof msgOrObj === 'string' && data) {
      baseLogger.warn(data as object, msgOrObj);
    } else if (typeof msgOrObj === 'string') {
      baseLogger.warn(msgOrObj);
    } else {
      baseLogger.warn(msgOrObj);
    }
  },
};

export default logger;
