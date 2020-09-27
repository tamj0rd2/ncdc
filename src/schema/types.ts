import type { Definition } from 'ts-json-schema-generator'
import { Type } from '~config/resource/type'

export interface SchemaRetriever {
  load: (type: Type) => Promise<Definition>
}
