import express, { Express, Request, Response, ErrorRequestHandler } from 'express'
import chalk from 'chalk'
import { Server } from 'http'
import { TypeValidator } from '~validation'
import { ProblemType } from '~problem'
import { SupportedMethod, Config } from '~config'
import serverLogger from './server-logger'
import { inspect } from 'util'

export interface ReqResLog {
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
  typeValidator: TypeValidator,
): Express => {
  const app = express()
  const ROOT = '/'
  const ignoredLogPaths = [ROOT]

  app.use(handleError)
  app.use(express.text())
  app.use(express.json())
  app.use(express.raw())
  app.get(ROOT, (_, res) => res.json(mockConfigs))

  mockConfigs.forEach(({ name, request, response }) => {
    const endpoint = request.endpoint.split('?')[0]

    app[verbsMap[request.method]](endpoint, async (req, res, next) => {
      try {
        if (request.type) {
          const problems = await typeValidator.getProblems(req.body, request.type, ProblemType.Request)
          serverLogger.warn(
            `An endpoint for ${req.path} exists but the request body did not match the type`,
            {
              problems,
            },
          )
          if (problems) return next()
        }

        // TODO: add this check for body
        // if (request.body)

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
    serverLogger.info(`Registered ${baseUrl}${endpoint} from config: ${chalk.blue(name)}`)
  })

  app.use((req, res, next) => {
    try {
      res.status(404)

      const responseBody =
        'NCDC ERROR: Could not find an endpoint to serve this request.\n\n' +
        `Go to ${baseUrl}${ROOT} to see a list of available endpoint configurations.`

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
      serverLogger.info(`Endpoints are being served on ${serverRoot}`)
    })
  })
}
