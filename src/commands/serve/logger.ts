import { createLogger, format, transports } from 'winston'
import { inspect } from 'util'
import { blue } from 'chalk'
import Problem from '~problem'

const logger = createLogger({
  exitOnError: false,
  transports: [
    new transports.Console({
      handleExceptions: true,
      level: 'debug',
      format: format.combine(
        format.colorize(),
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.errors({ stack: true }),
        format.printf(info => {
          let result = `${info.timestamp} - ${info.level}: `

          let message =
            typeof info.message === 'object' ? inspect(info.message, false, undefined, true) : info.message

          const matchedError = info.stack?.match(/Error: (.*)/)
          if (matchedError) message = message.replace(new RegExp(`${matchedError[1]}$`), '')

          result += message

          const problems = (info.problems as Optional<Problem[]>)
            ?.map(({ problemType, path, message }) => `${problemType} ${blue(path)} ${message}`)
            .join('\n')

          result += problems ? `\n${problems}` : ''
          result += info.stack ? `\n${info.stack}` : ''
          return result
        }),
      ),
    }),
  ],
})

export default logger
