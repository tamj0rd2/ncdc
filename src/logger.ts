import { createLogger, transports, format, addColors, Logger, LeveledLogMethod } from 'winston'
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

const customLevels = {
  levels: {
    debug: 0,
    info: 1,
    warn: 2,
    validationError: 3,
    error: 4,
  },
  colors: {
    debug: 'blue',
    info: 'green',
    warn: 'yellow',
    validationError: 'red',
    error: 'red',
  },
}

addColors(customLevels.colors)

const logger = createLogger({
  levels: customLevels.levels,
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
          let result = `${info.level}: `
          result += info.message
          result += IS_DEBUG_MODE && info?.stack ? `\n${info?.stack}` : ''
          return result
        }),
      ),
    }),
  ],
})

export default logger as Logger & Record<keyof typeof customLevels.levels, LeveledLogMethod>
