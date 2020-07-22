import type { Definition } from 'ts-json-schema-generator'

export interface SchemaRetriever {
  load: (symbolName: string) => Promise<Definition>
}
