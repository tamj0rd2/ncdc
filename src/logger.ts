import { createLogger, transports, format } from 'winston'
import { inspect } from 'util'
import inspector from 'inspector'

const IS_DEBUG_MODE = inspector.url()

const normalizeMessage = format(info => {
  const message =
    typeof info.message === 'object'
      ? (info.message = inspect(info.message, false, undefined, true))
      : info.message

  return { ...info, message: message }
})

const extractStack = format(info => {
  if (info.metadata?.stack) {
    const newInfo = { ...info, stack: info.metadata.stack }
    const matchedError = info.metadata?.stack?.match(/Error: (.*)/)
    if (matchedError) newInfo.message = info.message.replace(new RegExp(`${matchedError[1]}$`), '')
    return newInfo
  }
  return info
})

const logger = createLogger({
  exitOnError: false,
  transports: [
    new transports.Console({
      handleExceptions: true,
      level: IS_DEBUG_MODE ? 'debug' : 'info',
      format: format.combine(
        format.colorize(),
        format.metadata(),
        normalizeMessage(),
        extractStack(),
        format.printf(info => {
          let result = `${info.timestamp} - ${info.level}: `
          result += info.message
          result += IS_DEBUG_MODE && info?.stack ? `\n${info?.stack}` : ''
          return result
        }),
      ),
    }),
  ],
})

export default logger
