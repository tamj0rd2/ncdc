import { OutgoingHttpHeaders } from 'http'
import { existsSync, unlinkSync, writeFileSync, rmdirSync, mkdirSync, appendFileSync } from 'fs'
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
    serveBody?: unknown
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

  public withServeBody(serveBody: unknown): ConfigBuilder {
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

  public withType(typeName: string): ConfigBuilder {
    if (this.config.response.type) {
      throw new Error('Response type already set to ' + this.config.response.type)
    }

    this.config.response.type = typeName
    return this
  }

  public withEndpoints(...endpoints: string[]): ConfigBuilder {
    this.config.request.endpoints = endpoints
    return this
  }

  public build(): Config {
    return this.config
  }
}

export abstract class ConfigWrapper {
  private configs: Config[] = []
  private fixtures: Record<string, object> = {}
  private types: Record<string, object> = {}

  private readonly CONFIG_FILE: string
  private readonly FIXTURE_FOLDER: string
  private readonly TYPES_FILE: string
  private readonly RESPONSES_FOLDER: string

  constructor(configFile: string, fixtureFolder: string) {
    this.CONFIG_FILE = configFile
    this.FIXTURE_FOLDER = fixtureFolder
    this.TYPES_FILE = `${this.FIXTURE_FOLDER}/types.ts`
    this.RESPONSES_FOLDER = `${this.FIXTURE_FOLDER}/responses`

    if (existsSync(this.CONFIG_FILE)) this.deleteYaml()

    if (existsSync(this.RESPONSES_FOLDER)) {
      rmdirSync(this.RESPONSES_FOLDER, { recursive: true })
    }
    mkdirSync(this.RESPONSES_FOLDER)

    writeFileSync(this.TYPES_FILE, '')
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

    const filePath = `${this.RESPONSES_FOLDER}/${name}.json`
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

    const filePath = `${this.RESPONSES_FOLDER}/${name}.json`
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

    const filePath = `${this.RESPONSES_FOLDER}/${name}.json`
    if (!existsSync(filePath)) {
      throw new Error(`${filePath} does not exist on disk`)
    }

    delete this.fixtures[name]
    unlinkSync(filePath)
    return this
  }

  public deleteYaml(): ConfigWrapper {
    unlinkSync(this.CONFIG_FILE)
    this.configs = []
    return this
  }

  public addType(name: string, content: object): ConfigWrapper {
    if (this.types[name]) {
      throw new Error(`The type ${name} is already registered`)
    }

    this.types[name] = content
    appendFileSync(
      this.TYPES_FILE,
      `
      interface ${name} {
        ${Object.entries(content).map(([key, value]) => `${key}: ${value}`)}
      }
    `,
    )

    return this
  }

  private commitConfigs(): void {
    const yaml = jsyaml.safeDump(this.configs)
    writeFileSync(this.CONFIG_FILE, yaml)
  }

  private commitFixture(name: string, content: object): void {
    this.fixtures[name] = content
    const filePath = `${this.RESPONSES_FOLDER}/${name}.json`
    writeFileSync(filePath, JSON.stringify(content, null, 2))
  }
}
