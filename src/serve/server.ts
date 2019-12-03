import express, { Express, Request } from 'express'
import chalk from 'chalk'
import { OutgoingHttpHeaders } from 'http'
import { Data, SupportedMethod } from '../types'

export interface RouteConfig {
  name: string
  request: {
    method: SupportedMethod
    endpoint: string
  }
  response: {
    code?: number
    headers?: OutgoingHttpHeaders
    body?: Data
  }
}

export interface Log {
  name: string
  timestamp: string
  request: Pick<Request, 'method' | 'path' | 'query' | 'headers'>
  response: {
    headers: OutgoingHttpHeaders
    status: number
    body?: Data
  }
}

export const configureServer = (baseUrl: string, mockConfigs: RouteConfig[]): Express => {
  const app = express()
  const root = '/'
  const logPath = '/logs'
  const ignoredLogPaths = [root, logPath]

  // TODO: I want very basic logs for each request in the console too
  const logs: Log[] = []
  app.get(root, (_, res) => res.json(mockConfigs))
  app.get(logPath, (_, res) => res.json(logs.reverse()))

  mockConfigs.forEach(({ name, request, response }) => {
    const endpoint = request.endpoint.split('?')[0]

    if (request.method === 'GET') {
      app.get(endpoint, ({ method, path, query, headers }, res) => {
        if (response.code) res.status(response.code)
        if (response.headers) res.set(response.headers)

        if (!ignoredLogPaths.includes(path)) {
          logs.push({
            name,
            timestamp: new Date(Date.now()).toJSON(),
            request: { method, path, query, headers },
            response: {
              headers: res.getHeaders(),
              status: res.statusCode,
              body: response.body,
            },
          })
        }

        res.send(response.body)
      })
      console.log(`Registered ${baseUrl}${endpoint} from config: ${chalk.blue(name)}`)
    }
  })

  return app
}

export const startServer = (port: number, routes: RouteConfig[]): Promise<void> => {
  return new Promise(resolve => {
    const serverRoot = `http://localhost:${port}`
    const app = configureServer(serverRoot, routes)

    app.listen(port, () => {
      console.log(`\nEnpoints are being served on ${serverRoot}`)
    })

    app.on('exit', () => {
      resolve()
    })
  })
}
