import express, { Express, Request, Response, ErrorRequestHandler } from 'express'
import { blue } from 'chalk'
import { Server } from 'http'
import { TypeValidator } from '~validation'
import { Logger } from './server-logger'
import { inspect } from 'util'
import { ServeConfig } from '../config'
import validateQuery from './query-validator'
import { SupportedMethod } from '~config/types'
import { logMetric } from '~metrics'
import { areHeadersValid } from './header-validator'
import { isDeeplyEqual } from '~util'

export interface ReqResLog {
  name?: string
  request: Pick<Request, 'method' | 'path' | 'query' | 'body'>
  response: {
    status: number
    body?: Data
  }
}

export type PossibleMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head'

export const verbsMap: Record<SupportedMethod, PossibleMethod> = {
  GET: 'get',
  POST: 'post',
  PUT: 'put',
  DELETE: 'delete',
  PATCH: 'patch',
  OPTIONS: 'options',
  HEAD: 'head',
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mapLog = (
  name: Optional<string>,
  { method, path, query, body }: Request,
  res: Response,
  responseBody?: Data,
): ReqResLog => ({
  name: name ?? 'N/A',
  request: { method, path, query, body },
  response: {
    status: res.statusCode,
    body: responseBody,
  },
})

export const configureServer = (
  baseUrl: string,
  mockConfigs: ServeConfig[],
  typeValidator: TypeValidator | undefined,
  logger: Logger,
): Express => {
  const app = express()
  const ROOT = '/'
  const ignoredLogPaths = [ROOT]

  const handleError: ErrorRequestHandler = (err: Error, req, res, next) => {
    if (res.headersSent) return next()

    const { method, path, query, headers, body } = req
    logger.error(
      `Error while serving ${inspect({ method, path, query, headers, body }, false, undefined, true)}`,
      err,
    )
    res.status(500).send(err.stack?.toString() ?? err.toString())
  }

  app.use(handleError)
  app.use(express.text())
  app.use(express.json())
  app.use(express.raw())
  app.get(ROOT, (_, res) => res.json(mockConfigs))

  if (mockConfigs.length === 0) {
    logger.info('No mocks to serve')
  }

  mockConfigs.forEach(({ name, request, response }) => {
    const endpointWithoutQuery = request.endpoint.split('?')[0]

    app[verbsMap[request.method]](endpointWithoutQuery, async (req, res, next) => {
      try {
        if (request.headers) {
          const { success } = areHeadersValid(request.headers, req.headers)
          if (!success) {
            logger.warn(`An endpoint for ${req.path} exists but the headers did not match the configuration`)
            return next()
          }
        }

        const queryIsValid = validateQuery(request.endpoint, req.query)
        if (!queryIsValid) {
          logger.warn(
            `An endpoint for ${req.path} exists but the query params did not match the configuration`,
          )
          return next()
        }

        if (typeValidator && request.type) {
          const validationResult = await typeValidator.validate(req.body, request.type)
          if (!validationResult.success) {
            logger.warn(`An endpoint for ${req.path} exists but the request body did not match the type`)

            // TODO: something like this to capture better response codes
            // res.locals.status = 400
            return next()
          }
        }

        if (request.body && !request.type) {
          if (!isDeeplyEqual(request.body, req.body)) {
            logger.warn(`An endpoint for ${req.path} exists but the request body did not match`)
            return next()
          }
        }

        if (response.code) res.status(response.code)
        if (response.headers) res.set(response.headers)

        if (!ignoredLogPaths.includes(req.path)) {
          let bodyToLog: Data | undefined = response.body

          if (!!response.body) {
            const shortenedBody = response.body?.toString().substr(0, 30)
            bodyToLog = `${shortenedBody}${shortenedBody && shortenedBody.length >= 30 ? '...' : ''}`
          }

          logger.info(mapLog(name, req, res, bodyToLog))
        }

        res.send(response.body)
      } catch (err) {
        handleError(err, req, res, next)
      }
    })
    logger.verbose(`Registered ${baseUrl}${request.endpoint} from config: ${blue(name)}`)
  })

  const default404Response =
    'NCDC ERROR: Could not find an endpoint to serve this request.\n\n' +
    `Go to ${baseUrl}${ROOT} to see a list of available endpoint configurations.`

  app.use((req, res, next) => {
    try {
      const status = res.locals.status || 404
      res.status(status)

      const responseBody = status === 404 ? default404Response : `NCDC: ${res.locals.message}`

      if (!ignoredLogPaths.includes(req.path)) {
        logger.error(mapLog(undefined, req, res, responseBody.replace(/\n+/g, ' ')))
      }

      res.send(responseBody)
    } catch (err) {
      handleError(err, req, res, next)
    }
  })

  return app
}

export interface StartServerResult {
  server: Server
  close(): Promise<void>
}

export const startServer = (
  port: number,
  routes: ServeConfig[],
  typeValidator: TypeValidator | undefined,
  logger: Logger,
): StartServerResult => {
  const serverRoot = `http://localhost:${port}`
  const app = configureServer(serverRoot, routes, typeValidator, logger)

  const server = app.listen(port, () => {
    logger.info(`Endpoints are being served on ${serverRoot}`)
    logMetric('Server is listening')
  })

  return {
    server,
    close: (): Promise<void> =>
      new Promise((resolve, reject) => {
        server.close((err) => {
          if (err && (err as NodeJS.ErrnoException).code !== 'ERR_SERVER_NOT_RUNNING') {
            return reject(err)
          }

          return resolve()
        })
      }),
  }
}
