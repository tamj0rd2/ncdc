import { createCommand } from '../shared'
import * as opts from '~commands/options'
import { readYamlAsync } from '~io'
import { promises } from 'fs'
import { dirname, resolve } from 'path'

export const migrateCommand = createCommand<{ configPaths?: string[] }>({
  command: `migrate <${opts.CONFIG_PATHS}..>`,
  describe: 'Migrates your existing NCDC 2.x config files for use with the new programmatic API',
  builder: (yargs) => yargs.positional(opts.CONFIG_PATHS, opts.CONFIG_PATHS_OPTS),
  handler: async (args, deps) => {
    if (!args.configPaths) {
      throw new Error('You must provide at least 1 yml config path to migrate')
    }

    deps.logger.warn('This migrate command is experiemental and not maintained')

    const files = await Promise.all(
      args.configPaths.map<Promise<[string, Data]>>(async (path) => [path, await readYamlAsync(path)]),
    )
    // deps.logger.info(inspect(files, false, 8, true))

    const services = files.map(([path, data]) => {
      const pathSegments = path.split('/')
      const fixtureFolder = dirname(path)

      return {
        name: pathSegments[pathSegments.length - 1].replace(/\.ya?ml/, ''),
        baseUrl: 'TODO',
        port: 0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resources: (data as any).map((resource: any) => {
          if (typeof resource.request.endpoints === 'string') {
            resource.request.endpoints = [resource.request.endpoints]
          }

          if (resource.request.bodyPath) {
            const fixturePath = resource.request.bodyPath
            resource.request.body = fixtureFolder + fixturePath.replace(/^\./, '')
            delete resource.request.bodyPath
          }

          if (resource.response.bodyPath) {
            const fixturePath = resource.response.bodyPath
            resource.response.body = fixtureFolder + fixturePath.replace(/^\./, '')
            delete resource.response.bodyPath
          }

          if (resource.response.serveBodyPath) {
            const fixturePath = resource.response.serveBodyPath
            resource.response.serveBody = fixtureFolder + fixturePath.replace(/^\./, '')
            delete resource.response.serveBodyPath
          }

          return resource
        }),
      }
    })

    const content = configTemplate
      .replace(
        '{{SERVICES}}',
        JSON.stringify(services, null, 2)
          .replace(/"method": "(.*)"/g, '"method": Method.$1')
          .replace(/"(body|serveBody)": (".*")/g, '"$1": require(resolve(rootPath, $2))')
          .replace(/"([a-z0-9]+)": (.*)/gim, '$1: $2')
          .split('\n')
          .map((line, i) => (i === 0 ? line : `    ${line}`))
          .join('\n'),
      )

      .replace('{{TSCONFIG_PATH}}', args.tsconfigPath)
      .replace('{{SCHEMA_PATH}}', args.schemaPath ?? 'undefined')

    await promises.writeFile(resolve(process.cwd(), 'ncdc.config.ts'), content)
  },
})

const configTemplate = `
import { resolve } from 'path'
import { NCDC, Method } from 'ncdc'

async function start(): Promise<void> {
  const rootPath = process.cwd()
  const ncdc = new NCDC(
    {{SERVICES}},
    {
      tsconfigPath: resolve(process.cwd(), "{{TSCONFIG_PATH}}"),
      schemaPath: {{SCHEMA_PATH}},
      verbose: true,
    },
  )

  if (process.argv.includes('--serve')) {
    await ncdc.serve({ watch: true })
  } else if (process.argv.includes('--test')) {
    await ncdc.test({})
  } else if (process.argv.includes('--generate')) {
    await ncdc.generate({})
  } else {
    const msg = 'You need a test, serve or generate flag to run ncdc'
    console.error(msg)
    throw new Error(msg)
  }
  return
}

void start().catch(() => process.exit(1))
`
