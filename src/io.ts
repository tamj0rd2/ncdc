import { readFile, writeFile } from 'fs'
import { safeLoad } from 'js-yaml'
import { isAbsolute, resolve } from 'path'

const readFileAsync = (path: string): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    readFile(path, (err, data) => {
      if (err) return reject(err)
      resolve(data.toString())
    })
  })
}

export const readJsonAsync = async <TOut = Record<string, unknown>>(path: string): Promise<TOut> =>
  JSON.parse(await readFileAsync(path))

export const readYamlAsync = async <TOut>(path: string, shouldResolvePath = true): Promise<TOut> =>
  safeLoad(await readFileAsync(shouldResolvePath ? resolve(path) : path))

export const readFixture = (basePath: string, fixturePath: string): Promise<Data> => {
  const absolutePathToFile = isAbsolute(fixturePath) ? fixturePath : resolve(basePath, '..', fixturePath)
  if (fixturePath.endsWith('.json')) return readJsonAsync(absolutePathToFile)
  if (/\.ya?ml$/.test(fixturePath)) return readYamlAsync(absolutePathToFile, false)
  return readFileAsync(absolutePathToFile)
}

// eslint-disable-next-line @typescript-eslint/ban-types
export const writeJsonAsync = (obj: object, path: string): Promise<void> => {
  const data = JSON.stringify(obj, undefined, 2)
  const outPath = resolve(path)
  return new Promise((resolve, reject) => {
    writeFile(outPath, data, (err) => (err ? reject(err) : resolve()))
  })
}
