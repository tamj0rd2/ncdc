import { Config, ConfigBuilder } from '../config-builder'
import { existsSync, rmdirSync, mkdirSync, writeFileSync, unlinkSync } from 'fs'
import jsyaml from 'js-yaml'
import { JSONSchema7 } from 'json-schema'

export const TEST_ENV = './black-box-tests/test-environment'
export const NCDC_CONFIG_FILE = `${TEST_ENV}/config.yml`
export const TSCONFIG_FILE = `${TEST_ENV}/tsconfig.json`
export const JSON_SCHEMAS_FOLDER = `${TEST_ENV}/json-schemas`
export const FIXTURES_FOLDER = `${TEST_ENV}/fixtures` // TODO: change to fixtures
export const TYPES_FILE = `${TEST_ENV}/types.ts`

export class ConfigWrapper {
  private configs: Config[] = []
  private fixtures: Record<string, object> = {}
  private types: Record<string, object> = {}
  private schemas: Record<string, object> = {}

  constructor(private readonly ncdcConfigFile = NCDC_CONFIG_FILE, skipCleanup = false) {
    if (skipCleanup) return

    if (existsSync(ncdcConfigFile)) this.deleteYaml()

    if (existsSync(FIXTURES_FOLDER)) {
      rmdirSync(FIXTURES_FOLDER, { recursive: true })
    }
    mkdirSync(FIXTURES_FOLDER)

    if (existsSync(JSON_SCHEMAS_FOLDER)) {
      rmdirSync(JSON_SCHEMAS_FOLDER, { recursive: true })
    }
    mkdirSync(JSON_SCHEMAS_FOLDER)

    writeFileSync(TYPES_FILE, 'export {}')
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

    const filePath = `${FIXTURES_FOLDER}/${name}.json`
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

    const filePath = `${FIXTURES_FOLDER}/${name}.json`
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

    const filePath = `${FIXTURES_FOLDER}/${name}.json`
    if (!existsSync(filePath)) {
      throw new Error(`${filePath} does not exist on disk`)
    }

    delete this.fixtures[name]
    unlinkSync(filePath)
    return this
  }

  public deleteYaml(): ConfigWrapper {
    unlinkSync(this.ncdcConfigFile)
    this.configs = []
    return this
  }

  public addType(name: string, content: object): ConfigWrapper {
    if (this.types[name]) {
      throw new Error(`The type ${name} is already registered`)
    }

    this.types[name] = content
    this.commitTypes()
    return this
  }

  public editType(name: string, mutate: (content: object) => object): ConfigWrapper {
    if (!this.types[name]) {
      throw new Error(`The type ${name} is not registered`)
    }

    this.types[name] = mutate(this.types[name])
    this.commitTypes()
    return this
  }

  public deleteType(name: string): ConfigWrapper {
    if (!this.types[name]) {
      throw new Error(`The type ${name} is not registered`)
    }

    delete this.types[name]
    this.commitTypes()
    return this
  }

  public addSchemaFile(name: string, content: JSONSchema7): ConfigWrapper {
    if (this.schemas[name]) {
      throw new Error(`The schema ${name} is already registered`)
    }

    this.schemas[name] = content

    writeFileSync(`${JSON_SCHEMAS_FOLDER}/${name}.json`, JSON.stringify(content, undefined, 2))
    return this
  }

  public editSchemaFile(name: string, content: object): ConfigWrapper {
    if (!this.schemas[name]) {
      throw new Error(`The schema ${name} is not registered`)
    }

    this.schemas[name] = content
    writeFileSync(`${JSON_SCHEMAS_FOLDER}/${name}.json`, JSON.stringify(content, undefined, 2))
    return this
  }

  private commitConfigs(): void {
    const yaml = jsyaml.safeDump(this.configs)
    writeFileSync(this.ncdcConfigFile, yaml)
  }

  private commitFixture(name: string, content: object): void {
    this.fixtures[name] = content
    const filePath = `${FIXTURES_FOLDER}/${name}.json`
    writeFileSync(filePath, JSON.stringify(content, null, 2))
  }

  private commitTypes(): void {
    const fullContent =
      Object.entries(this.types).reduce((accum, [name, content]) => {
        return (
          accum +
          `interface ${name} {\n${Object.entries(content)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n')}}\n`
        )
      }, '') + '\nexport {}'

    writeFileSync(TYPES_FILE, fullContent)
  }
}
