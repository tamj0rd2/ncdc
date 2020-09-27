import { readJsonAsync } from '~io'
import type { Definition } from 'ts-json-schema-generator'
import type { SchemaRetriever } from './types'
import { Type } from '~config/resource/type'

export class FsSchemaLoader implements SchemaRetriever {
  private readonly cache: { [symbol: string]: Definition } = {}

  constructor(private readonly schemaPath: string) {}

  public async load(type: Type): Promise<Definition> {
    const symbolName = type.get()
    return (
      this.cache[symbolName] ??
      (this.cache[symbolName] = await readJsonAsync(`${this.schemaPath}/${symbolName}.json`))
    )
  }
}
