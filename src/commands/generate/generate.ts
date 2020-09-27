import { SchemaRetriever } from '~schema'
import { writeJsonAsync } from '~io'
import { Type } from '~config/resource/type'

export const generate = async (
  schemaRetriever: SchemaRetriever,
  types: Type[],
  outputPath: string,
): Promise<void> => {
  await Promise.all(
    types.map(async (type) => {
      const schema = await schemaRetriever.load(type)
      return writeJsonAsync(schema, `${outputPath}/${type}.json`)
    }),
  )
}

export type Generate = typeof generate
