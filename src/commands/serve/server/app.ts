import express, { Express, Request, Response, ErrorRequestHandler } from 'express'
import { blue } from 'chalk'
import { TypeValidator } from '~validation'
import { inspect } from 'util'
import { SupportedMethod, Resource } from '~config/types'
import { isDeeplyEqual } from '~util'
import { NcdcLogger } from '~logger'

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

export const configureApp = (
  baseUrl: string,
  resources: Resource[],
  getTypeValidator: () => Promise<TypeValidator>,
  logger: NcdcLogger,
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
  app.get(ROOT, (_, res) => res.json(resources))

  if (resources.length === 0) {
    logger.info('No mocks to serve')
  }

  resources.forEach(({ name, request, response }) => {
    app[verbsMap[request.method]](request.pathName, async (req, res, next) => {
      try {
        if (!request.headers.matches(req.headers)) {
          logger.warn(`An endpoint for ${req.path} exists but the headers did not match the configuration`)
          return next()
        }

        if (!request.query.matches(req.query)) {
          logger.warn(
            `An endpoint for ${req.path} exists but the query params did not match the configuration`,
          )
          return next()
        }

        if (request.type) {
          const typeValidator = await getTypeValidator()
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

        res.status(response.code)
        res.set(response.headers.getAll())

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
    logger.verbose(`Registered ${request.formatUrl(baseUrl)} from config: ${blue(name)}`)
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
