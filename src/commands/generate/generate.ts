import { SchemaRetriever } from '~schema'
import { existsSync, mkdirSync } from 'fs'
import { resolve } from 'path'
import { writeJsonAsync } from '~io'

export const generate = async (
  schemaRetriever: SchemaRetriever,
  types: string[],
  outputPath: string,
): Promise<void> => {
  const outDir = resolve(outputPath)
  if (!existsSync(outDir)) mkdirSync(outDir)

  await Promise.all(
    types.map(async (type) => {
      const schema = await schemaRetriever.load(type)
      return writeJsonAsync(schema, `${outDir}/${type}.json`)
    }),
  )
}

export type Generate = typeof generate
