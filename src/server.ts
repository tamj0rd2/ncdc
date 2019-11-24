import express, { Express } from 'express'
import { MockConfig } from './config'
import { IncomingHttpHeaders } from 'http'

interface RequestLog {
  method: string
  path: string
  timestamp: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any
  headers: IncomingHttpHeaders
}

const configureServer = (serverRoot: string, mockConfigs: MockConfig[]): Express => {
  const app = express()
  const root = '/'
  const logPath = '/logs'
  const ignoredLogPaths = [root, logPath]

  const requestLogs: RequestLog[] = []
  app.use(({ method, path, query, headers }, _, next) => {
    if (ignoredLogPaths.includes(path)) return next()
    // TODO: it'd be cool to log the name of the configuration too
    requestLogs.push({ method, path, timestamp: new Date().toJSON(), query, headers })
    next()
  })

  mockConfigs.forEach(({ name, request, response }) => {
    const endpoint = (request.mockEndpoint ?? request.endpoint).split('?')[0]

    if (request.method === 'GET') {
      app.get(new RegExp(endpoint), (_, res) => res.send(response.mockBody ?? response.body))
      console.log(`Registered ${serverRoot}${endpoint} from config: ${name}`)
    }
  })

  app.get('/', (_, res) => res.send(mockConfigs))
  app.get(logPath, (_, res) => res.send(requestLogs.reverse()))
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
