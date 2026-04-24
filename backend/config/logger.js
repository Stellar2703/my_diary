import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration from environment variables
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, '..', 'logs');
const LOG_MAX_SIZE = parseInt(process.env.LOG_MAX_SIZE) || 5242880; // 5MB
const LOG_MAX_FILES = parseInt(process.env.LOG_MAX_FILES) || 5;
const LOG_DATE_FORMAT = process.env.LOG_DATE_FORMAT || 'YYYY-MM-DD HH:mm:ss';
const LOG_FILE_COMBINED = process.env.LOG_FILE_COMBINED || 'combined.log';
const LOG_FILE_ERROR = process.env.LOG_FILE_ERROR || 'error.log';
const ENABLE_ERROR_STACK_TRACES = process.env.ENABLE_ERROR_STACK_TRACES !== 'false';

// Create logs directory if it doesn't exist
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Formatting function
const getLogFormat = (includeColor = false) => {
  const formats = [
    winston.format.timestamp({ format: LOG_DATE_FORMAT }),
    winston.format.errors({ stack: ENABLE_ERROR_STACK_TRACES })
  ];

  if (includeColor) {
    formats.push(winston.format.colorize());
  }

  formats.push(
    winston.format.printf(({ timestamp, level, message, stack, ...rest }) => {
      let logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

      // Add metadata if present
      if (Object.keys(rest).length > 0) {
        logMessage += ` ${JSON.stringify(rest)}`;
      }

      // Add stack trace if present and enabled
      if (stack && ENABLE_ERROR_STACK_TRACES) {
        logMessage += `\n${stack}`;
      }

      return logMessage;
    })
  );

  return winston.format.combine(...formats);
};

// Create logger
const logger = winston.createLogger({
  level: LOG_LEVEL,
  defaultMeta: { service: 'peekhour-api' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: getLogFormat(true)
    }),

    // File transport - All logs
    new winston.transports.File({
      filename: path.join(LOG_DIR, LOG_FILE_COMBINED),
      maxsize: LOG_MAX_SIZE,
      maxFiles: LOG_MAX_FILES,
      format: getLogFormat(false)
    }),

    // File transport - Errors only
    new winston.transports.File({
      filename: path.join(LOG_DIR, LOG_FILE_ERROR),
      level: 'error',
      maxsize: LOG_MAX_SIZE,
      maxFiles: LOG_MAX_FILES,
      format: getLogFormat(false)
    })
  ]
});

// Additional helper methods
logger.http = (message, meta) => logger.info(message, { ...meta, type: 'http' });
logger.db = (message, meta) => logger.info(message, { ...meta, type: 'database' });
logger.auth = (message, meta) => logger.info(message, { ...meta, type: 'auth' });
logger.security = (message, meta) => logger.warn(message, { ...meta, type: 'security' });

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', { error: err.message, stack: err.stack });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', { reason, promise });
});

export default logger;
