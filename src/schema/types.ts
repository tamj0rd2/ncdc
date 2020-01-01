import { Definition } from 'typescript-json-schema'

export interface SchemaRetriever {
  load: (symbolName: string) => Promise<Definition>
}
