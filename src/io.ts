import { readFile } from 'fs'
import { safeLoad } from 'js-yaml'
import { isAbsolute, resolve } from 'path'

export const readFileAsync = (path: string): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    readFile(path, (err, data) => {
      if (err) return reject(err)
      resolve(data.toString())
    })
  })
}

export const readJsonAsync = async <TOut = object>(path: string): Promise<TOut> =>
  JSON.parse(await readFileAsync(path))

export const readYamlAsync = async <TOut>(path: string, resolvePath = true): Promise<TOut> =>
  safeLoad(await readFileAsync(resolvePath ? resolve(path) : path))

export const readFixture = (basePath: string, fixturePath: string): Promise<Data> => {
  const absolutePathToFile = isAbsolute(fixturePath) ? fixturePath : resolve(basePath, '..', fixturePath)
  if (fixturePath.endsWith('.json')) return readJsonAsync(absolutePathToFile)
  if (/\.ya?ml$/.test(fixturePath)) return readYamlAsync(absolutePathToFile, false)
  return readFileAsync(absolutePathToFile)
}
