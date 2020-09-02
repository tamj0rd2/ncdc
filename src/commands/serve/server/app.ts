import express, { Express, Request, Response, NextFunction } from 'express'
import { blue } from 'chalk'
import { TypeValidator } from '~validation'
import { inspect } from 'util'
import { SupportedMethod, Resource } from '~config'
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
export type GetTypeValidator = () => Promise<TypeValidator>

export const verbsMap: Record<SupportedMethod, PossibleMethod> = {
  [SupportedMethod.GET]: 'get',
  [SupportedMethod.POST]: 'post',
  [SupportedMethod.PUT]: 'put',
  [SupportedMethod.DELETE]: 'delete',
  [SupportedMethod.PATCH]: 'patch',
  [SupportedMethod.OPTIONS]: 'options',
  [SupportedMethod.HEAD]: 'head',
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
  getTypeValidator: GetTypeValidator,
  logger: NcdcLogger,
): Express => {
  const app = express()
  const ROOT = '/'
  const ignoredLogPaths = [ROOT]

  app.use(express.text())
  app.use(express.json())
  app.use(express.raw())
  // the below line is necessary because if next is omitted, I thinks we're using a normal request handler.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    const { method, path, query, headers, body } = req
    logger.error(
      `Error while serving ${inspect({ method, path, query, headers, body }, false, undefined, true)}`,
      err,
    )
    res.status(500).send(err.stack?.toString() ?? err.toString())
  })
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
          if (!request.body.matches(req.body)) {
            logger.warn(`An endpoint for ${req.path} exists but the request body did not match`)
            return next()
          }
        }

        res.status(response.code)
        res.set(response.headers.getAll())

        if (!ignoredLogPaths.includes(req.path)) {
          logger.info(mapLog(name, req, res, response.body?.toString()))
        }

        res.send(response.body?.get())
      } catch (err) {
        return next(err)
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
      return next(err)
    }
  })

  return app
}
