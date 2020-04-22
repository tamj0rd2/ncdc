import { HandleError, CreateTypeValidator } from '~commands'
import { resolve } from 'path'
import { validate, transformConfigs } from './config'
import { readYamlAsync } from '~io'
import { Config } from '~config'
import { TypeValidator } from '~validation'
import { Server } from 'http'
import chokidar from 'chokidar'
import logger from '~logger'

export interface ServeArgs {
  configPath?: string
  port: number
  tsconfigPath: string
  schemaPath?: string
  force: boolean
}

export type StartServer = (port: number, routes: Config[], typeValidator?: TypeValidator) => Server

const CONFIG_ERROR_PREFIX = 'Could not start serving due to config errors:\n\n'

const validateConfigBodies = async (
  configs: Config[],
  typeValidator: TypeValidator,
): Promise<Optional<string>> => {
  const seenConfigNames = new Set<string>()
  const uniqueConfigs = configs.filter((config) => {
    if (seenConfigNames.has(config.name)) return false
    seenConfigNames.add(config.name)
    return true
  })

  let totalValidationError = ''
  for (const config of uniqueConfigs) {
    const validationErrors: string[] = []

    if (config.request.body && config.request.type) {
      const result = await typeValidator.validate(config.request.body, config.request.type)
      if (!result.success) {
        const message = `Config '${config.name}' request body failed type validation:\n${result.errors.join(
          '\n',
        )}`
        validationErrors.push(message)
      }
    }
    if (config.response.body && config.response.type) {
      const result = await typeValidator.validate(config.response.body, config.response.type)
      if (!result.success) {
        const message = `Config '${config.name}' response body failed type validation:\n${result.errors.join(
          '\n',
        )}`
        validationErrors.push(message)
      }
    }

    totalValidationError += validationErrors.join('\n')
  }

  if (totalValidationError) return CONFIG_ERROR_PREFIX + totalValidationError
}

const createHandler = (
  handleError: HandleError,
  createTypeValidator: CreateTypeValidator,
  startServer: StartServer,
) => async (args: ServeArgs): Promise<void> => {
  const { configPath, port, tsconfigPath, schemaPath, force } = args

  if (!configPath) return handleError({ message: 'config path must be supplied' })
  if (isNaN(port)) return handleError({ message: 'port must be a number' })

  const absoluteConfigPath = resolve(configPath)
  let typeValidator: TypeValidator | undefined

  const prepareForServerStart = async (): Promise<Config[]> => {
    const validationResult = validate(await readYamlAsync(absoluteConfigPath))
    if (!validationResult.success) {
      return handleError({
        message: `${CONFIG_ERROR_PREFIX}${validationResult.errors.join('\n')}`,
      })
    }

    if (!validationResult.validatedConfig.length) return handleError({ message: 'No configs to serve' })

    const configUsesTypes = validationResult.validatedConfig.find((c) => c.request.type || c.response.type)
    if (!typeValidator && configUsesTypes) {
      typeValidator = configUsesTypes && createTypeValidator(tsconfigPath, force, schemaPath)
    }

    const transformedConfigs = await transformConfigs(validationResult.validatedConfig, absoluteConfigPath)

    if (typeValidator) {
      const bodyValidationMessage = await validateConfigBodies(transformedConfigs, typeValidator)
      if (bodyValidationMessage) return handleError({ message: bodyValidationMessage })
    }
    return transformedConfigs
  }

  const configs = await prepareForServerStart()
  let server = startServer(port, configs, typeValidator)

  chokidar.watch(absoluteConfigPath, { ignoreInitial: true, cwd: process.cwd() }).on('all', (e, path) => {
    logger.info('Restarting ncdc server')
    server.close(async (err) => {
      if (err && (err as NodeJS.ErrnoException).code !== 'ERR_SERVER_NOT_RUNNING') {
        return logger.error(`Could not start server: ${err.message}`)
      }

      try {
        const configs = await prepareForServerStart()
        server = startServer(port, configs, typeValidator)
      } catch (err) {
        logger.error(`Could not start server: ${err.message}`)
      }
    })
  })

  // TODO: bring back some better watching logic
  // TODO: also, stop using the shared Config thing in serve. It can have its own interface now.
  // no point muddling up the different contexts again

  // const runServer = async (): Promise<Server> => {
  //   const typeValidator = createTypeValidator(tsconfigPath, force, schemaPath)
  //   const configs = await readConfig(fullConfigPath, typeValidator, Mode.Serve)
  //   return startServer(port, configs, typeValidator)
  // }

  // let server = await runServer()
  // const restartServer = (): Promise<void> =>
  //   new Promise<void>((resolve, reject) => {
  //     server.close(async (err) => {
  //       if (err && (err as NodeJS.ErrnoException).code !== 'ERR_SERVER_NOT_RUNNING') return reject(err)

  //       try {
  //         server = await runServer()
  //       } catch (err) {
  //         return reject(err)
  //       }
  //       resolve()
  //     })
  //   })

  // chokidar.watch(fullConfigPath, { ignoreInitial: true }).on('all', async (e) => {
  //   logger.debug(`Chokdar event - ${e}`)

  //   switch (e) {
  //     case 'add':
  //     case 'change':
  //     case 'unlink':
  //       logger.info('Restarting ncdc serve')

  //       try {
  //         await restartServer()
  //       } catch (err) {
  //         if (err.code === 'ENOENT') {
  //           return logger.error(`Could not start server - no such file or directory ${fullConfigPath}`)
  //         }
  //         handleError(err)
  //       }

  //       break
  //   }
  // })
}

export default createHandler
