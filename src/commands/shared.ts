import { TypeValidator } from '~validation'
import Problem from '~problem'
import { blue, yellow } from 'chalk'
import logger from '~logger'
import { inspect } from 'util'

export type HandleError = (error: Error) => never
export type CreateTypeValidator = (
  allErrors: boolean,
  tsconfigPath: string,
  schemaPath?: string,
) => TypeValidator

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

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const colorInspect = (obj: any, depth?: number) => inspect(obj, false, depth, true)

export const logValidationErrors = (problems: ReadonlyArray<Problem>): void => {
  groupBy(problems, x => x.path).forEach((groupedProblems, dataPath) => {
    groupBy(groupedProblems, x => x.problemType).forEach((groupedByType, type) => {
      const result = groupedByType.map(({ message }) => {
        const messagePrefix = blue(`${type} ${dataPath}`)
        return `${messagePrefix} ${message}`
      })

      const { data, schema } = groupedProblems[0]
      if (data) result.push(`${yellow('Data:')} ${colorInspect(data, dataPath === Problem.rootPath ? 0 : 4)}`)
      if (schema) result.push(`${yellow('Schema:')} ${colorInspect(schema, 2)}`)

      logger.error(result.join('\n'))
    })
  })
}
