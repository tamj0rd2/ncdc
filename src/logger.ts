import { createLogger, transports, format, Logger, LoggerOptions } from 'winston'
import { inspect } from 'util'
import inspector from 'inspector'
import escapeStringRegex from 'escape-string-regexp'

const IS_DEBUG_MODE = inspector.url() || process.env.LOG_LEVEL === 'debug'

const normalizeMessage = format((info) => {
  const message =
    typeof info.message === 'object'
      ? (info.message = inspect(info.message, false, undefined, true))
      : info.message

  return { ...info, message: message }
})

const extractStack = format((info) => {
  if (info.metadata?.stack) {
    const newInfo = { ...info, stack: info.metadata.stack }
    const matchedError = info.metadata?.stack?.match(/Error: (.*)/)
    if (matchedError) {
      const escapedSearch = escapeStringRegex(matchedError[1])
      newInfo.message = info.message.replace(new RegExp(`${escapedSearch}$`), '')
    }
    return newInfo
  }
  return info
})

export type NcdcLogger = Pick<Logger, 'debug' | 'verbose' | 'info' | 'warn' | 'error' | 'child'>

const getLoggerOptions = (verbose: boolean): LoggerOptions => {
  return {
    exitOnError: true,
    transports: [
      new transports.Console({
        handleExceptions: true,
        level: IS_DEBUG_MODE ? 'debug' : verbose ? 'verbose' : 'info',
        format: format.combine(
          format.colorize(),
          format.metadata(),
          normalizeMessage(),
          extractStack(),
          format.printf((info) => {
            let result = info.metadata.label ? `${info.metadata.label} | ` : ''
            result += `${info.level} `
            result += info.message
            result += IS_DEBUG_MODE && info?.stack ? `\n${info?.stack}` : ''
            return result
          }),
        ),
      }),
    ],
  }
}

const createNcdcLogger = (verbose: boolean): NcdcLogger => createLogger(getLoggerOptions(verbose))

export default createNcdcLogger
