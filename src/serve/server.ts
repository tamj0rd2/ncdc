import express from 'express'
import { MockConfig } from '../config'
import { IncomingHttpHeaders } from 'http'

interface RequestLog {
  method: string
  path: string
  timestamp: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any
  headers: IncomingHttpHeaders
}

export const startServer = (port: number, routes: MockConfig[]): void => {
  const app = express()
  const logPath = '/'
  const serveRoot = `http://localhost:${port}`

  const requestLogs: RequestLog[] = []

  app.use(({ method, path, query, headers }, _, next) => {
    if (path === logPath) return next()
    // TODO: it'd be cool to log the name of the configuration too
    requestLogs.push({ method, path, timestamp: new Date().toJSON(), query, headers })
    next()
  })

  routes.forEach(({ name, request, response }) => {
    if (request.method === 'GET') {
      const endpoint = (request.mockEndpoint ?? request.endpoint).split('?')[0]
      const chosenResponse = response.mockBody ?? response.body
      app.get(new RegExp(endpoint), (_, res) => res.send(chosenResponse))
      console.log(`Registered http://localhost:${port}${endpoint} from config: ${name}`)
    }
  })
  console.log()

  app.get(logPath, (_, res) => res.send(requestLogs.reverse()))

  app.listen(port, () => {
    console.log(`Enpoints are being served on ${serveRoot}`)
  })
}
