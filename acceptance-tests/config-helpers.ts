import { OutgoingHttpHeaders } from 'http'
import { existsSync, unlinkSync, writeFileSync, rmdirSync, mkdirSync } from 'fs'
import { CONFIG_FILE, FIXTURE_FOLDER } from './cli-wrapper'
import jsyaml from 'js-yaml'

export interface Config {
  name: string
  request: {
    method: string
    endpoints: string[]
    serveEndpoint: string
  }
  response: {
    code: number
    headers?: OutgoingHttpHeaders
    type?: string
    serveBody?: any
    serveBodyPath?: string
  }
}

export class ConfigBuilder {
  private config: Config = {
    name: 'Books',
    request: {
      method: 'GET',
      endpoints: ['/api/books/123', '/api/books/456'],
      serveEndpoint: '/api/books/*',
    },
    response: {
      code: 200,
      headers: { 'content-type': 'application/json' },
      serveBody: {
        ISBN: '9780141187761',
        ISBN_13: '978 - 0141187761',
        author: 'George Orwell',
        title: '1984 Nineteen Eighty- Four',
      },
    },
  }

  public withName(name: string): ConfigBuilder {
    this.config.name = name
    return this
  }

  public withCode(code: number): ConfigBuilder {
    this.config.response.code = code
    return this
  }

  public withServeBody(serveBody: any): ConfigBuilder {
    if (!serveBody) {
      delete this.config.response.serveBody
      return this
    }

    this.config.response.serveBody = serveBody
    return this
  }

  public withFixture(name = 'response'): ConfigBuilder {
    if (this.config.response.serveBodyPath) {
      throw new Error('Response serveBodyPath already set to ' + this.config.response.serveBodyPath)
    }

    this.config.response.serveBodyPath = `./responses/${name}.json`
    return this
  }

  public build(): Config {
    return this.config
  }
}

export class ConfigWrapper {
  private configs: Config[] = []
  private fixtures: Record<string, object> = {}

  private static ResponsesFolder = `${FIXTURE_FOLDER}/responses`

  constructor() {
    if (existsSync(CONFIG_FILE)) this.deleteYaml()
    if (existsSync(ConfigWrapper.ResponsesFolder))
      rmdirSync(ConfigWrapper.ResponsesFolder, { recursive: true })
    mkdirSync(ConfigWrapper.ResponsesFolder)
  }

  public addConfig(config = new ConfigBuilder().build()): ConfigWrapper {
    if (this.configs.find((c) => c.name === config.name)) {
      throw new Error(`Config with name ${config.name} is already defined`)
    }

    this.configs.push(config)
    this.commitConfigs()
    return this
  }

  public editConfig(name: string, mutate: (config: Config) => Config): ConfigWrapper {
    const configIndex = this.configs.findIndex((c) => c.name === name)

    if (configIndex === -1) {
      throw new Error(`Could not find a config with the name ${name}`)
    }

    this.configs[configIndex] = mutate(this.configs[configIndex])
    this.commitConfigs()
    return this
  }

  public addFixture(name: string, content: object): ConfigWrapper {
    if (this.fixtures[name]) {
      throw new Error(`Fixture with name ${name} already exists`)
    }

    const filePath = `${ConfigWrapper.ResponsesFolder}/${name}.json`
    if (existsSync(filePath)) {
      throw new Error(`${filePath} already exists on disk`)
    }

    this.commitFixture(name, content)
    return this
  }

  public editFixture(name: string, mutate: (f: object) => object): ConfigWrapper {
    const fixture = this.fixtures[name]

    if (!fixture) {
      throw new Error(`Fixture with name ${name} is not registered`)
    }

    const filePath = `${ConfigWrapper.ResponsesFolder}/${name}.json`
    if (!existsSync(filePath)) {
      throw new Error(`${filePath} does not exist on disk`)
    }

    this.commitFixture(name, mutate(fixture))
    return this
  }

  public deleteFixture(name: string): ConfigWrapper {
    if (!this.fixtures[name]) {
      throw new Error(`Fixture with name ${name} is not registered`)
    }

    const filePath = `${ConfigWrapper.ResponsesFolder}/${name}.json`
    if (!existsSync(filePath)) {
      throw new Error(`${filePath} does not exist on disk`)
    }

    delete this.fixtures[name]
    unlinkSync(filePath)
    return this
  }

  public deleteYaml(): ConfigWrapper {
    unlinkSync(CONFIG_FILE)
    this.configs = []
    return this
  }

  private commitConfigs(): void {
    const yaml = jsyaml.safeDump(this.configs)
    writeFileSync(CONFIG_FILE, yaml)
  }

  private commitFixture(name: string, content: object): void {
    this.fixtures[name] = content
    const filePath = `${ConfigWrapper.ResponsesFolder}/${name}.json`
    writeFileSync(filePath, JSON.stringify(content, null, 2))
  }
}
