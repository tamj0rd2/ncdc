import { createLogger, format, transports } from 'winston'
import { inspect } from 'util'
import escapeStringRegexp from 'escape-string-regexp'
import { NcdcLogger } from '~logger'
import inspector from 'inspector'

const IS_DEBUG_MODE = inspector.url() || process.env.LOG_LEVEL === 'debug'

// TODO: deprecate this
export const createServerLogger = (verbose: boolean): NcdcLogger =>
  createLogger({
    exitOnError: false,
    transports: [
      new transports.Console({
        handleExceptions: true,
        level: IS_DEBUG_MODE ? 'debug' : verbose ? 'verbose' : 'info',
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
