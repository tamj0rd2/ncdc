import { OutgoingHttpHeaders } from 'http'
import { existsSync, unlinkSync, writeFileSync } from 'fs'
import { CONFIG_FILE } from './cli-wrapper'
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
    headers: OutgoingHttpHeaders
    type: string
    serveBody: any
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
      type: 'Book',
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

  public build(): Config {
    return this.config
  }
}

export class ConfigWrapper {
  private configs: Config[] = []

  constructor() {
    if (existsSync(CONFIG_FILE)) this.deleteFile()
  }

  public addConfig(config = new ConfigBuilder().build()): ConfigWrapper {
    if (this.configs.find((c) => c.name === config.name)) {
      throw new Error(`Config with name ${config.name} is already defined`)
    }

    this.configs.push(config)
    this.commitConfig()
    return this
  }

  public editConfig(name: string, mutate: (config: Config) => Config): ConfigWrapper {
    const configIndex = this.configs.findIndex((c) => c.name === name)

    if (configIndex === -1) {
      throw new Error(`Could not find a config with the name ${name}`)
    }

    this.configs[configIndex] = mutate(this.configs[configIndex])
    this.commitConfig()
    return this
  }

  public deleteFile(): ConfigWrapper {
    unlinkSync(CONFIG_FILE)
    this.configs = []
    return this
  }

  private commitConfig(): void {
    const yaml = jsyaml.safeDump(this.configs)
    writeFileSync(CONFIG_FILE, yaml)
  }
}
