import { TypeValidator } from '~validation'
import Problem from '~problem'
import { blue } from 'chalk'
import logger from '~logger'
import { inspect } from 'util'

export type HandleError = (error: Error) => never
export type CreateTypeValidator = (
  allErrors: boolean,
  tsconfigPath: string,
  schemaPath?: string,
) => TypeValidator

const groupBy = <T>(items: T[], getKey: (item: T) => string): Map<string, T[]> =>
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

export const logValidationErrors = (problems: Problem[]): void => {
  groupBy(problems, x => x.path).forEach((groupedProblems, dataPath) => {
    groupBy(groupedProblems, x => x.problemType).forEach((groupedByType, type) => {
      groupedByType.forEach(({ message }) => {
        const messagePrefix = blue(`${type} ${dataPath}`)
        logger.info(`${messagePrefix} ${message}`)
      })

      const { data, schema } = groupedProblems[0]
      if (data) logger.info(`Data: ${inspect(data, false, 4, true)}`)
      if (schema) logger.info(`Schema: ${inspect(schema, false, 4, true)}`)
    })
  })
}
