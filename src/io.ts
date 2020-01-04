import { readFile } from 'fs'

export const readFileAsync = (path: string): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    readFile(path, 'utf8', (err, data) => {
      if (err) return reject(err)

      try {
        resolve(data)
      } catch (err) {
        reject(err)
      }
    })
  })
}

export const readJsonAsync = async <TOut = object>(path: string): Promise<TOut> =>
  JSON.parse(await readFileAsync(path))
