import pino from 'pino'

const isProduction = process.env.NODE_ENV === 'production'

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  transport: isProduction
    ? undefined // Production'da JSON format
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
  // Production'da ek bilgiler
  ...(isProduction && {
    formatters: {
      level: (label: string) => {
        return { level: label }
      },
    },
    timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
  }),
})

// Request-specific logger oluştur
export function createRequestLogger(requestId: string) {
  return logger.child({ requestId })
}

// Error logger
export function logError(error: Error, context?: Record<string, unknown>) {
  logger.error({
    err: error,
    ...context,
    stack: error.stack,
    message: error.message,
  })
}

// Business event logger
export function logBusinessEvent(event: string, data: Record<string, unknown>) {
  logger.info({
    event,
    ...data,
    type: 'business',
  })
}

// Security event logger
export function logSecurityEvent(event: string, data: Record<string, unknown>) {
  logger.warn({
    event,
    ...data,
    type: 'security',
  })
}

export default logger
