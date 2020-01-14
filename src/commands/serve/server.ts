import express, { Express, Request, Response, ErrorRequestHandler } from 'express'
import chalk from 'chalk'
import { Server } from 'http'
import { TypeValidator } from '~validation'
import { ProblemType } from '~problem'
import { SupportedMethod, Config } from '~config'
import logger from './logger'
import { inspect } from 'util'

export interface Log {
  name?: string
  request: Pick<Request, 'method' | 'path' | 'query' | 'body'>
  response: {
    status: number
    body?: Data
  }
}

const verbsMap: { [K in SupportedMethod]: 'get' | 'post' } = {
  GET: 'get',
  POST: 'post',
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mapLog = (
  name: Optional<string>,
  { method, path, query, body }: Request,
  res: Response,
  responseBody?: Data,
): Log => ({
  name,
  request: { method, path, query, body },
  response: {
    status: res.statusCode,
    body: responseBody,
  },
})

const handleError: ErrorRequestHandler = (err: Error, req, res, next) => {
  if (res.headersSent) return next()

  const { method, path, query, headers, body } = req
  logger.error(
    `Error while serving ${inspect({ method, path, query, headers, body }, false, undefined, true)}`,
    err,
  )
  res.status(500).send(err.stack?.toString() ?? err.toString())
}

export const configureServer = (
  baseUrl: string,
  mockConfigs: Config[],
  typeValidator: TypeValidator,
): Express => {
  const app = express()
  const ROOT = '/'
  const LOG_PATH = '/logs'
  const ignoredLogPaths = [ROOT, LOG_PATH]

  // const logs: Log[] = []
  app.use(handleError)
  app.use(express.text())
  app.use(express.json())
  app.use(express.raw())
  app.get(ROOT, (_, res) => res.json(mockConfigs))
  // app.get(LOG_PATH, (_, res) => res.json(logs.reverse().slice(0, 15)))

  mockConfigs.forEach(({ name, request, response }) => {
    const endpoint = request.endpoint.split('?')[0]

    app[verbsMap[request.method]](endpoint, async (req, res, next) => {
      try {
        if (request.type) {
          const problems = await typeValidator.getProblems(req.body, request.type, ProblemType.Request)
          logger.warn(`An endpoint for ${req.path} exists but the body did not match the type`, { problems })
          // TODO: I want to somehow log these problems somewhere. Also, the output should be different from the above
          if (problems) return next()
        }

        // TODO: add this check for body
        // if (request.body)

        if (response.code) res.status(response.code)
        if (response.headers) res.set(response.headers)
        const { method, path, query, body } = req

        if (!ignoredLogPaths.includes(req.path)) {
          const shortenedBody = response.body?.toString().substr(0, 30)

          // TODO: logging needs to be made much nicer. Just use winston
          logger.info({
            request: { method, path, query, body },
            response: {
              status: res.statusCode,
              body: `${shortenedBody}${shortenedBody && shortenedBody.length >= 30 ? '...' : ''}`,
            },
          })
          // logs.push(mapLog(name, req, res, response.body))
        }

        res.send(response.body)
      } catch (err) {
        handleError(err, req, res, next)
      }
    })
    logger.info(`Registered ${baseUrl}${endpoint} from config: ${chalk.blue(name)}`)
  })

  app.use((req, res, next) => {
    try {
      res.status(404)
      const { method, path, query, body } = req

      const response =
        'NCDC ERROR: Could not find an endpoint to serve this request\n\n' +
        `Go to ${baseUrl}${ROOT} to see a list of available endpoint configurations\n` +
        `Go to ${baseUrl}${LOG_PATH} to see details about this request\n`
      if (!ignoredLogPaths.includes(req.path)) {
        // TODO: logging needs to be made much nicer. Just use winston
        logger.error({
          request: { method, path, query, body },
          response: {
            status: res.statusCode,
            body: 'NCDC ERROR: Could not find an endpoint to serve this request',
          },
        })
      }

      res.send(response)
    } catch (err) {
      handleError(err, req, res, next)
    }
  })

  return app
}

export const startServer = (
  port: number,
  routes: Config[],
  typeValidator: TypeValidator,
): Promise<Server> => {
  return new Promise(resolve => {
    const serverRoot = `http://localhost:${port}`
    const app = configureServer(serverRoot, routes, typeValidator)

    app.on('exit', () => {
      resolve()
    })

    return app.listen(port, () => {
      logger.info(`Endpoints are being served on ${serverRoot}`)
    })
  })
}
