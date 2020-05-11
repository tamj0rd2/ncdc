import { Definition } from 'typescript-json-schema'

export interface SchemaRetriever {
  init?: () => void
  load: (symbolName: string) => Promise<Definition>
}
