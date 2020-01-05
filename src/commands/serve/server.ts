import express, { Express, Request, Response, ErrorRequestHandler } from 'express'
import chalk from 'chalk'
import { OutgoingHttpHeaders, Server } from 'http'
import { Data } from '~types'
import TypeValidator from '~validation/type-validator'
import { ProblemType } from '~problem'
import { SupportedMethod, Config } from '~config'

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

const handleError: ErrorRequestHandler = (err: Error, req, res, next) => {
  if (res.headersSent) return next()

  const { method, path, query, headers, body } = req
  console.log(chalk.red(chalk.bold('NCDC ERROR:'), 'An unknown error occurred'))
  console.log(err)
  console.log(chalk.blue('Details:'))
  console.dir({ method, path, query, headers, body })
  console.log()
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

  // TODO: I want very basic logs for each request in the console too
  // const logs: Log[] = []
  app.use(handleError)
  app.use(express.text())
  app.use(express.json())
  // app.use(express.urlencoded()) // TODO: find a way to get this back in. deprecation warning
  app.use(express.raw())
  app.get(ROOT, (_, res) => res.json(mockConfigs))
  // app.get(LOG_PATH, (_, res) => res.json(logs.reverse().slice(0, 15)))

  mockConfigs.forEach(({ name, request, response }) => {
    const endpoint = request.endpoint.split('?')[0]

    app[verbsMap[request.method]](endpoint, async (req, res, next) => {
      try {
        if (request.type) {
          const problems = await typeValidator.getProblems(req.body, request.type, ProblemType.Request)
          // TODO: I want to somehow log these problems somewhere. Also, the output should be different from the above
          if (problems) return next()
        }

        // TODO: add this check for body
        // if (request.body)

        if (response.code) res.status(response.code)
        if (response.headers) res.set(response.headers)
        const { method, path, query, headers, body } = req

        if (!ignoredLogPaths.includes(req.path)) {
          // TODO: logging needs to be made much nicer. Just use winston
          console.dir({
            timestamp: new Date(Date.now()).toJSON(),
            request: { method, path, query, headers, body },
            response: {
              headers: res.getHeaders(),
              status: res.statusCode,
              body: 'NCDC: Omitted to save space',
            },
          })
          // logs.push(mapLog(name, req, res, response.body))
        }

        res.send(response.body)
      } catch (err) {
        handleError(err, req, res, next)
      }
    })
    console.log(`Registered ${baseUrl}${endpoint} from config: ${chalk.blue(name)}`)
  })

  app.use((req, res, next) => {
    try {
      res.status(404)
      const { method, path, query, headers, body } = req

      const response =
        'NCDC ERROR: Could not find an endpoint to serve this request\n\n' +
        `Go to ${baseUrl}${ROOT} to see a list of available endpoint configurations\n` +
        `Go to ${baseUrl}${LOG_PATH} to see details about this request\n`
      if (!ignoredLogPaths.includes(req.path)) {
        // TODO: logging needs to be made much nicer. Just use winston
        console.dir({
          timestamp: new Date(Date.now()).toJSON(),
          request: { method, path, query, headers, body },
          response: {
            headers: res.getHeaders(),
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
      console.log(`\nEndpoints are being served on ${serverRoot}\n`)
    })
  })
}
