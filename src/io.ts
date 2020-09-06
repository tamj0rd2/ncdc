import { promises } from 'fs'
import { safeLoad } from 'js-yaml'
import { isAbsolute, resolve, dirname } from 'path'

const { writeFile: writeFileAsync, mkdir: mkdirAsync, readFile: readFileAsync } = promises
const utf8 = 'utf-8'

export const readJsonAsync = async <TOut = object>(
  pathSegment1: string,
  ...pathSegments: string[]
): Promise<TOut> => JSON.parse(await readFileAsync(resolve(pathSegment1, ...pathSegments), utf8))

export const readYamlAsync = async <TOut>(path: string): Promise<TOut> =>
  safeLoad(await readFileAsync(resolve(path), utf8))

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
export const writeJsonAsync = async (obj: object, path: string): Promise<void> => {
  const outputPath = resolve(path)
  await mkdirAsync(dirname(outputPath), { recursive: true })

  const data = JSON.stringify(obj, undefined, 2)
  return writeFileAsync(outputPath, data)
}
