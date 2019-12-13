import express, { Express, Request, Response } from 'express'
import chalk from 'chalk'
import { OutgoingHttpHeaders } from 'http'
import { Data, SupportedMethod } from '../types'
import TypeValidator from '../validation/type-validator'
import { ProblemType } from '../problem'

export interface RouteConfig {
  name: string
  request: {
    method: SupportedMethod
    endpoint: string
    bodyType?: string
  }
  response: {
    code?: number
    headers?: OutgoingHttpHeaders
    body?: Data
  }
}

export interface Log {
  name?: string
  timestamp: string
  request: Pick<Request, 'method' | 'path' | 'query' | 'headers' | 'body'>
  response: {
    headers: OutgoingHttpHeaders
    status: number
    body?: Data
  }
}

const verbsMap: { [K in SupportedMethod]: 'get' | 'post' } = {
  GET: 'get',
  POST: 'post',
}

const mapLog = (
  name: Optional<string>,
  { method, path, query, headers, body }: Request,
  res: Response,
  responseBody?: Data,
): Log => ({
  name,
  timestamp: new Date(Date.now()).toJSON(),
  request: { method, path, query, headers, body },
  response: {
    headers: res.getHeaders(),
    status: res.statusCode,
    body: responseBody,
  },
})

export const configureServer = (
  baseUrl: string,
  mockConfigs: RouteConfig[],
  typeValidator: TypeValidator,
): Express => {
  const app = express()
  const ROOT = '/'
  const LOG_PATH = '/logs'
  const ignoredLogPaths = [ROOT, LOG_PATH]

  // TODO: I want very basic logs for each request in the console too
  const logs: Log[] = []
  app.use(express.text())
  app.use(express.json())
  app.use(express.urlencoded())
  app.use(express.raw())
  app.get(ROOT, (_, res) => res.json(mockConfigs))
  app.get(LOG_PATH, (_, res) => res.json(logs.reverse()))

  mockConfigs.forEach(({ name, request, response }: RouteConfig) => {
    const endpoint = request.endpoint.split('?')[0]

    app[verbsMap[request.method]](endpoint, async (req, res, next) => {
      if (request.bodyType) {
        const problems = await typeValidator.getProblems(req.body, request.bodyType, ProblemType.Request)
        if (problems) {
          // TODO: I want to somehow log these problems somewhere
          return next()
        }
      }

      if (response.code) res.status(response.code)
      if (response.headers) res.set(response.headers)
      if (!ignoredLogPaths.includes(req.path)) {
        logs.push(mapLog(name, req, res, response.body))
      }

      res.send(response.body)
    })
    console.log(`Registered ${baseUrl}${endpoint} from config: ${chalk.blue(name)}`)
  })

  app.use((req, res) => {
    res.status(404)

    const body =
      'NCDC ERROR: Could not find an endpoint to serve this request\n\n' +
      `Go to ${baseUrl}${ROOT} to see a list of available endpoint configurations\n` +
      `Go to ${baseUrl}${LOG_PATH} to see details about this request\n`
    if (!ignoredLogPaths.includes(req.path)) {
      logs.push(mapLog(undefined, req, res, body))
    }

    res.send(body)
  })

  return app
}

export const startServer = (
  port: number,
  routes: RouteConfig[],
  typeValidator: TypeValidator,
): Promise<void> => {
  return new Promise(resolve => {
    const serverRoot = `http://localhost:${port}`
    const app = configureServer(serverRoot, routes, typeValidator)

    app.listen(port, () => {
      console.log(`\nEndpoints are being served on ${serverRoot}`)
    })

    app.on('exit', () => {
      resolve()
    })
  })
}
