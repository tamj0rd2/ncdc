import { resolve } from 'path'
import { readJsonAsync } from '../io'
import { Definition } from 'typescript-json-schema'
import { SchemaRetriever } from './types'

export default class SchemaLoader implements SchemaRetriever {
  private readonly cache: { [symbol: string]: Definition } = {}

  constructor(private readonly schemaPath: string) {}

  public async load(symbolName: string): Promise<Definition> {
    return (
      this.cache[symbolName] ??
      (this.cache[symbolName] = await readJsonAsync(resolve(this.schemaPath, `${symbolName}.json`)))
    )
  }
}
