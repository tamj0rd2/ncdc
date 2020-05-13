import { createLogger, format, transports, Logger as WinstonLogger } from 'winston'
import { inspect } from 'util'
import escapeStringRegexp from 'escape-string-regexp'

export type Logger = WinstonLogger

export const createServerLogger = (logLevel: string): Logger =>
  createLogger({
    exitOnError: false,
    transports: [
      new transports.Console({
        handleExceptions: true,
        level: logLevel,
        format: format.combine(
          format.colorize(),
          format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          format.errors({ stack: true }),
          format.printf((info) => {
            let result = `${info.timestamp} - ${info.level}: `

            let message =
              typeof info.message === 'object' ? inspect(info.message, false, 4, true) : info.message

            const matchedError = info.stack?.match(/Error: (.*)/)
            if (matchedError && matchedError[1]) {
              const escapedMatch = escapeStringRegexp(matchedError[1])
              message = message.replace(new RegExp(`${escapedMatch}$`), '')
            }

            result += message
            result += info.stack ? `\n${info.stack}` : ''
            return result
          }),
        ),
      }),
    ],
  })

export default createServerLogger
