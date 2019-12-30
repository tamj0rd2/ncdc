import { readFile } from 'fs'

export const readJsonAsync = <TOut = object>(path: string): Promise<TOut> => {
  return new Promise<TOut>((resolve, reject) => {
    readFile(path, (err, data) => {
      if (err) return reject(err)

      try {
        resolve(JSON.parse(data.toString()))
      } catch (err) {
        reject(err)
      }
    })
  })
}
