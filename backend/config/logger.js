import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack, ...rest }) => {
      let logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
      if (Object.keys(rest).length > 0) {
        logMessage += ` ${JSON.stringify(rest)}`;
      }
      if (stack) {
        logMessage += `\n${stack}`;
      }
      return logMessage;
    })
  ),
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, stack, ...rest }) => {
          let logMessage = `[${timestamp}] [${level}] ${message}`;
          if (Object.keys(rest).length > 0) {
            logMessage += ` ${JSON.stringify(rest)}`;
          }
          if (stack) {
            logMessage += `\n${stack}`;
          }
          return logMessage;
        })
      )
    }),
    // File transports
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

export default logger;
