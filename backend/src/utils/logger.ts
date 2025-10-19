import pino from 'pino';
import config from '../config/index';

const isDev = config.NODE_ENV === 'development';

export const logger = pino(
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

export default logger;
