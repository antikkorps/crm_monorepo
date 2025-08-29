import winston from "winston"
import config from "../config/environment"

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
)

// Create logger instance
export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { service: "medical-crm-backend" },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),

    // File transport for errors
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),

    // File transport for all logs
    new winston.transports.File({
      filename: "logs/combined.log",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
})

// Handle uncaught exceptions and rejections
logger.exceptions.handle(new winston.transports.File({ filename: "logs/exceptions.log" }))

logger.rejections.handle(new winston.transports.File({ filename: "logs/rejections.log" }))

// Error creation utility
export const createError = (
  message: string,
  statusCode: number = 500,
  code: string = "INTERNAL_ERROR",
  details?: any
): Error => {
  const error = new Error(message) as any
  error.statusCode = statusCode
  error.code = code
  error.details = details
  return error
}

export default logger
