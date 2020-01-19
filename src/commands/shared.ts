import { TypeValidator } from '~validation'
import Problem from '~problem'
import { blue, yellow } from 'chalk'
import { inspect } from 'util'

export type HandleError = (error: Error) => never
export type CreateTypeValidator = (tsconfigPath: string, schemaPath?: string) => TypeValidator

const groupBy = <T>(items: ReadonlyArray<T>, getKey: (item: T) => string): Map<string, ReadonlyArray<T>> =>
  [...items]
    .sort((a, b) => getKey(a).localeCompare(getKey(b)))
    .reduce((map, item) => {
      const key = getKey(item)
      const collection = map.get(key)
      if (collection) {
        collection.push(item)
      } else {
        map.set(key, [item])
      }
      return map
    }, new Map<string, T[]>())

export const colorInspect = (obj: any, depth?: number): string => inspect(obj, false, depth, true)

export const gatherValidationErrors = (problems: ReadonlyArray<Problem>): string =>
  Array.from(groupBy(problems, x => x.problemType))
    .map(([type, groupedProblems]) =>
      Array.from(groupBy(groupedProblems, x => x.path))
        .map(([dataPath, groupedByType]) => {
          const result = groupedByType.map(({ message }) => {
            const messagePrefix = blue(`${type} ${dataPath}`)
            return `${messagePrefix} ${message}`
          })

          const { value, showValue, schema, showSchema, definedBy, allowedValues } = groupedByType[0]

          if (value && showValue)
            result.push(`${yellow('Value:')} ${colorInspect(value, dataPath === Problem.rootPath ? 0 : 4)}`)
          if (allowedValues) result.push(`${yellow('Allowed values')}: ${allowedValues}`)
          if (definedBy) result.push(`${yellow('Defined by')}: ${definedBy}`)
          if (schema && showSchema) result.push(`${yellow('Schema:')} ${colorInspect(schema, 2)}`)

          return `${result.join('\n')}\n`
        })
        .join('\n'),
    )
    .join('\n')
