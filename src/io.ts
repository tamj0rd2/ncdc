import { promises } from 'fs'
import { safeLoad } from 'js-yaml'
import { JSONSchema7 } from 'json-schema'
import { isAbsolute, resolve, dirname } from 'path'

const { writeFile: writeFileAsync, mkdir: mkdirAsync, readFile: readFileAsync } = promises
const utf8 = 'utf-8'

export class EmptyFileError extends Error {
  constructor(filePath: string) {
    super(`The file ${filePath} was empty`)
    Object.setPrototypeOf(this, EmptyFileError.prototype)
  }
}

export const readJsonAsync = async <TOut = Record<string, unknown>>(
  pathSegment1: string,
  ...pathSegments: string[]
): Promise<TOut> => JSON.parse(await readFileAsync(resolve(pathSegment1, ...pathSegments), utf8))

export const readYamlAsync = async <TOut>(path: string): Promise<TOut> => {
  const filePath = resolve(path)
  const content = await safeLoad(await readFileAsync(filePath, utf8))
  if (!content) throw new EmptyFileError(filePath)
  return content
}

export const getFixturePath = (basePath: string, fixturePath: string): string => {
  return isAbsolute(fixturePath) ? fixturePath : resolve(basePath, '..', fixturePath)
}

export const readFixture = (basePath: string, fixturePath: string): Promise<Data> => {
  const absolutePathToFile = getFixturePath(basePath, fixturePath)
  if (fixturePath.endsWith('.json')) return readJsonAsync(absolutePathToFile)
  if (/\.ya?ml$/.test(fixturePath)) return readYamlAsync(absolutePathToFile)
  return readFileAsync(absolutePathToFile, utf8)
}

// TODO: swap these args around
export const writeJsonAsync = async (
  path: string,
  obj: Record<string, unknown> | JSONSchema7,
): Promise<void> => {
  const outputPath = resolve(path)
  await mkdirAsync(dirname(outputPath), { recursive: true })

  const data = JSON.stringify(obj, undefined, 2)
  return writeFileAsync(outputPath, data)
}
