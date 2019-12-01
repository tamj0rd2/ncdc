import express, { Express, Request } from 'express'
import { MockConfig } from './config'
import chalk from 'chalk'

type RequestLog = Pick<Request, 'method' | 'path' | 'query' | 'headers'> & {
  timestamp: string
}

export const configureServer = (baseUrl: string, mockConfigs: MockConfig[]): Express => {
  const app = express()
  const root = '/'
  const logPath = '/logs'
  const ignoredLogPaths = [root, logPath]

  const requestLogs: RequestLog[] = []
  app.use(({ method, path, query, headers }, _, next) => {
    if (ignoredLogPaths.includes(path)) return next()
    // TODO: it'd be cool to log the name of the configuration too
    requestLogs.push({ method, path, timestamp: new Date(Date.now()).toJSON(), query, headers })
    next()
  })

  mockConfigs.forEach(({ name, request, response }) => {
    const endpoint = (request.mockEndpoint ?? request.endpoint).split('?')[0]

    if (request.method === 'GET') {
      app.get(endpoint, (_, res) => res.send(response.body))
      console.log(`Registered ${baseUrl}${endpoint} from config: ${chalk.blue(name)}`)
    }
  })

  app.get(root, (_, res) => res.json(mockConfigs))
  app.get(logPath, (_, res) => res.json(requestLogs.reverse()))
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
