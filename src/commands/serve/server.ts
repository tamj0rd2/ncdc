import express, { Express, Request, Response, ErrorRequestHandler } from 'express'
import { blue } from 'chalk'
import { Server } from 'http'
import { TypeValidator } from '~validation'
import { ProblemType } from '~problem'
import { SupportedMethod, Config } from '~config'
import serverLogger from './server-logger'
import { inspect } from 'util'
import { parse } from 'url'
import { isQueryMismatch } from './utils'

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

const handleError: ErrorRequestHandler = (err: Error, req, res, next) => {
  if (res.headersSent) return next()

  const { method, path, query, headers, body } = req
  serverLogger.error(
    `Error while serving ${inspect({ method, path, query, headers, body }, false, undefined, true)}`,
    err,
  )
  res.status(500).send(err.stack?.toString() ?? err.toString())
}

export const configureServer = (
  baseUrl: string,
  mockConfigs: Config[],
  typeValidator?: TypeValidator,
): Express => {
  const app = express()
  const ROOT = '/'
  const ignoredLogPaths = [ROOT]

  app.use(handleError)
  app.use(express.text())
  app.use(express.json())
  app.use(express.raw())
  app.get(ROOT, (_, res) => res.json(mockConfigs))

  if (mockConfigs.length === 0) {
    serverLogger.info('No mocks to serve')
  }

  mockConfigs.forEach(({ name, request, response }) => {
    const endpointWithoutQuery = request.endpoint.split('?')[0]

    app[verbsMap[request.method]](endpointWithoutQuery, async (req, res, next) => {
      try {
        // TODO ======= finish up by adding tests. maybe extract it out
        const actualQuery = parse(req.url, true).query
        const expectedQuery = parse(request.endpoint, true).query

        const queryMismatches = Object.keys(expectedQuery)
          .map((key) => isQueryMismatch(key, expectedQuery[key], actualQuery[key]))
          .filter((x): x is string => !!x)

        if (queryMismatches.length) {
          res.locals.message = queryMismatches.join('\n')
          res.locals.status = 400
          return next()
        }
        // ============================================

        if (typeValidator && request.type) {
          const problems = await typeValidator.getProblems(req.body, request.type, ProblemType.Request)
          serverLogger.warn(
            `An endpoint for ${req.path} exists but the request body did not match the type`,
            {
              problems,
            },
          )
          if (problems) {
            // TODO: something like this to capture better response codes
            // res.locals.status = 400
            return next()
          }
        }

        if (response.code) res.status(response.code)
        if (response.headers) res.set(response.headers)

        if (!ignoredLogPaths.includes(req.path)) {
          const shortenedBody = response.body?.toString().substr(0, 30)
          const bodyToLog = `${shortenedBody}${shortenedBody && shortenedBody.length >= 30 ? '...' : ''}`

          serverLogger.info(mapLog(name, req, res, bodyToLog))
        }

        res.send(response.body)
      } catch (err) {
        handleError(err, req, res, next)
      }
    })
    serverLogger.info(`Registered ${baseUrl}${request.endpoint} from config: ${blue(name)}`)
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
        serverLogger.error(mapLog(undefined, req, res, responseBody.replace(/\n+/g, ' ')))
      }

      res.send(responseBody)
    } catch (err) {
      handleError(err, req, res, next)
    }
  })

  return app
}

export const startServer = (port: number, routes: Config[], typeValidator?: TypeValidator): Server => {
  const serverRoot = `${process.env.SERVE_HOST || 'http://localhost'}:${port}`
  const app = configureServer(serverRoot, routes, typeValidator)

  return app.listen(port, () => {
    serverLogger.info(`Endpoints are being served on ${serverRoot}`)
  })
}
