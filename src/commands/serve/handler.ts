import { HandleError, CreateTypeValidator } from '~commands'
import { resolve, isAbsolute } from 'path'
import { validate, transformConfigs, Config } from './config'
import { readYamlAsync } from '~io'
import { TypeValidator } from '~validation'
import logger from '~logger'
import chokidar from 'chokidar'
import { StartServerResult } from './server'

export interface ServeArgs {
  configPath?: string
  port: number
  tsconfigPath: string
  schemaPath?: string
  force: boolean
}

export type StartServer = (port: number, routes: Config[], typeValidator?: TypeValidator) => StartServerResult

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

  type PrepAndStartResult = {
    startServerResult: StartServerResult
    pathsToWatch: string[]
  }

  const prepAndStartServer = async (): Promise<PrepAndStartResult> => {
    const validationResult = validate(await readYamlAsync(absoluteConfigPath))
    if (!validationResult.success) {
      throw new Error(`${CONFIG_ERROR_PREFIX}${validationResult.errors.join('\n')}`)
    }

    if (!validationResult.validatedConfigs.length) throw new Error('No configs to serve')

    const configUsesTypes = validationResult.validatedConfigs.find((c) => c.request.type || c.response.type)
    if (!typeValidator && configUsesTypes) {
      typeValidator = configUsesTypes && createTypeValidator(tsconfigPath, force, schemaPath)
    }

    const transformedConfigs = await transformConfigs(validationResult.validatedConfigs, absoluteConfigPath)

    if (typeValidator) {
      const bodyValidationMessage = await validateConfigBodies(transformedConfigs, typeValidator)
      if (bodyValidationMessage) throw new Error(bodyValidationMessage)
    }

    const startServerResult = startServer(port, transformedConfigs, typeValidator)
    return {
      startServerResult,
      pathsToWatch: validationResult.validatedConfigs
        .flatMap((c) => [c.request.bodyPath, c.response.bodyPath, c.response.serveBodyPath])
        .filter((x): x is string => !!x)
        .map((p) => (isAbsolute(p) ? p : resolve(absoluteConfigPath, '..', p))),
    }
  }

  let result: PrepAndStartResult
  try {
    result = await prepAndStartServer()
  } catch (err) {
    return handleError(err)
  }

  const configWatcher = chokidar.watch([absoluteConfigPath, ...result.pathsToWatch], {
    ignoreInitial: true,
  })

  configWatcher.on('all', async (e, path) => {
    logger.info(`${e} event detected for ${path}`)
    logger.info('Attempting to restart ncdc server')

    if (e === 'unlink') {
      // makes sure that we can still watch the file for changes after its deletion
      configWatcher.add(path)
    }

    try {
      await result.startServerResult.close()
    } catch (err) {
      logger.error(`Could not restart the server: ${err.message}`)
      return
    }

    try {
      result = await prepAndStartServer()
    } catch (err) {
      logger.error(`Could not restart ncdc server: ${err.message}`)
      return
    }

    configWatcher.unwatch('**/*')
    configWatcher.add([absoluteConfigPath, ...result.pathsToWatch])
  })
}

export default createHandler
