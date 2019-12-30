import SchemaGenerator from '../validation/schema-generator'
import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { resolve } from 'path'

export const generate = async (
  schemaGenerator: SchemaGenerator,
  types: string[],
  outputPath: string,
): Promise<void> => {
  const outDir = resolve(outputPath)
  if (!existsSync(outDir)) mkdirSync(outDir)

  for (const type of types) {
    const schema = await schemaGenerator.load(type)
    const formatted = JSON.stringify(schema, null, 2)
    writeFileSync(resolve(outDir, `${type}.json`), formatted, 'utf8')
  }
}
