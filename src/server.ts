import express, { Express, Request } from 'express'
import { MockConfig } from './config'
import chalk from 'chalk'
import { OutgoingHttpHeaders } from 'http'
import { Data } from './types'

export interface Log {
  config: string
  timestamp: string
  request: Pick<Request, 'method' | 'path' | 'query' | 'headers'>
  response: {
    headers: OutgoingHttpHeaders
    status: number
    body: Data
  }
}

export const configureServer = (baseUrl: string, mockConfigs: MockConfig[]): Express => {
  const app = express()
  const root = '/'
  const logPath = '/logs'
  const ignoredLogPaths = [root, logPath]

  const logs: Log[] = []
  mockConfigs.forEach(({ name, request: requestConfig, response: responseConfig }) => {
    const endpoint = (requestConfig.mockEndpoint ?? requestConfig.endpoint).split('?')[0]

    if (requestConfig.method === 'GET') {
      app.get(endpoint, ({ method, path, query, headers }, res) => {
        if (responseConfig.code) res.status(responseConfig.code)
        res.send(responseConfig.body)

        // TODO: I want these logging to the console too
        if (!ignoredLogPaths.includes(path)) {
          logs.push({
            config: name,
            timestamp: new Date(Date.now()).toJSON(),
            request: { method, path, query, headers },
            response: {
              headers: res.getHeaders(),
              status: res.statusCode,
              body: responseConfig.body,
            },
          })
        }
      })
      console.log(`Registered ${baseUrl}${endpoint} from config: ${chalk.blue(name)}`)
    }
  })

  app.get(root, (_, res) => res.json(mockConfigs))
  app.get(logPath, (_, res) => res.json(logs.reverse()))
  return app
}

export const startServer = (port: number, routes: MockConfig[]): Promise<void> => {
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
