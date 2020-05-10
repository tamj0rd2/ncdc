import { SchemaRetriever } from '~schema'
import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { resolve } from 'path'

export const generate = async (
  schemaRetriever: SchemaRetriever,
  types: string[],
  outputPath: string,
): Promise<void> => {
  const outDir = resolve(outputPath)
  if (!existsSync(outDir)) mkdirSync(outDir)

  for (const type of types) {
    const schema = await schemaRetriever.load(type)
    const formatted = JSON.stringify(schema, null, 2)
    writeFileSync(resolve(outDir, `${type}.json`), formatted, 'utf8')
  }
}

export type Generate = typeof generate
