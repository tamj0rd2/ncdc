import { Definition } from 'typescript-json-schema'

export type DataObject = { [index: string]: Data }
export type Data = string | number | boolean | DataObject | Data[]
export type SupportedMethod = 'GET' | 'POST'

export interface SchemaRetriever {
  load: (symbolName: string) => Promise<Definition>
}
