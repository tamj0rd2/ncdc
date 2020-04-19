import { HandleError, CreateTypeValidator } from '~commands'
import { resolve } from 'path'
import { validate, ValidationSuccess, transformConfigs } from './config'
import { readYamlAsync } from '~io'
import { Config } from '~config'
import { TypeValidator } from '~validation'
import { Server, request } from 'http'

export interface ServeArgs {
  configPath?: string
  port: number
  tsconfigPath: string
  schemaPath?: string
  force: boolean
}

export type StartServer = (port: number, routes: Config[], typeValidator?: TypeValidator) => Server

const createHandler = (
  handleError: HandleError,
  createTypeValidator: CreateTypeValidator,
  startServer: StartServer,
) => async (args: ServeArgs): Promise<void> => {
  const { configPath, port, tsconfigPath, schemaPath, force } = args

  if (!configPath) return handleError({ message: 'config path must be supplied' })
  if (isNaN(port)) return handleError({ message: 'port must be a number' })

  const absoluteConfigPath = resolve(configPath)
  const validationResult = validate(await readYamlAsync(absoluteConfigPath))
  if (!validationResult.success) {
    return handleError({
      message: `Could not start serving due to config errors:\n${validationResult.errors.join('\n')}`,
    })
  }

  if (!validationResult.validatedConfig.length) return handleError({ message: 'No configs to serve' })

  // TODO: if config uses types, validate any bodies against their types
  const configUsesTypes = validationResult.validatedConfig.find((c) => c.request.type || c.response.type)
  const typeValidator = configUsesTypes && createTypeValidator(tsconfigPath, force, schemaPath)
  const transformedConfigs = await transformConfigs(validationResult.validatedConfig, absoluteConfigPath)

  startServer(port, transformedConfigs, typeValidator)

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
