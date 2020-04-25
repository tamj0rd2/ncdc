import { TypeValidator } from '~validation'
import Problem from '~problem'
import { blue, yellow } from 'chalk'
import { inspect } from 'util'

export type HandleError = (error: { message: string }) => never
export type CreateTypeValidator = (tsconfigPath: string, force: boolean, schemaPath?: string) => TypeValidator

const groupBy = <T>(items: ReadonlyArray<T>, getKey: (item: T) => string): Map<string, ReadonlyArray<T>> =>
  items.reduce((map, item) => {
    const key = getKey(item)
    const collection = map.get(key)
    if (collection) {
      collection.push(item)
    } else {
      map.set(key, [item])
    }
    return map
  }, new Map<string, T[]>())

const colorInspect = (obj: any, depth?: number): string => inspect(obj, false, depth, true)

export const gatherValidationErrors = (problems: ReadonlyArray<Problem>): string =>
  Array.from(groupBy(problems, (x) => x.path))
    .map(([dataPath, groupedProblems]) =>
      Array.from(groupBy(groupedProblems, (x) => x.problemType))
        .map(([type, groupedByType]) => {
          const result = groupedByType.map(({ message }) => {
            const messagePrefix = blue(`${type} ${dataPath}`)
            return `${messagePrefix} ${message}`
          })

          const { value: data, schema } = groupedProblems[0]
          if (data)
            result.push(`${yellow('Data:')} ${colorInspect(data, dataPath === Problem.rootPath ? 0 : 4)}`)
          if (schema) result.push(`${yellow('Schema:')} ${colorInspect(schema, 2)}`)

          return result.join('\n')
        })
        .join('\n'),
    )
    .join('\n')
