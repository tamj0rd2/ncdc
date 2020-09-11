import { SchemaRetriever } from '~schema'
import { writeJsonAsync } from '~io'

export const generate = async (
  schemaRetriever: SchemaRetriever,
  types: string[],
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
