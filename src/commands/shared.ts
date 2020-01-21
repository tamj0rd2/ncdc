import { TypeValidator } from '~validation'
import Problem from '~problem'
import { blue, yellow } from 'chalk'
import { inspect } from 'util'

export type HandleError = (error: Error) => never
export type CreateTypeValidator = (tsconfigPath: string, schemaPath?: string) => TypeValidator

const groupBy = <T>(items: ReadonlyArray<T>, getKey: (item: T) => string): Map<string, Readonly<T>[]> =>
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
    .map(([type, groupedByType]) => {
      return groupedByType
        .sort((a, b) => a.path.localeCompare(b.path))
        .reduce<string[]>((accum, problem, i) => {
          const { path, message, value, showValue, schema, showSchema, definedBy, allowedValues } = problem
          const output = [`${blue(type)} ${blue(path)} ${message}`]

          if (value && showValue)
            output.push(`${yellow('Value:')} ${colorInspect(value, path === Problem.rootPath ? 0 : 4)}`)
          if (allowedValues) output.push(`${yellow('Allowed values')}: ${allowedValues}`)
          if (definedBy) output.push(`${yellow('Defined by')}: ${definedBy}`)
          if (schema && showSchema) output.push(`${yellow('Schema:')} ${colorInspect(schema, 2)}`)

          const joinedOutput = output.join('\n')

          if (output.length > 1) {
            const isPreviousMultiline = accum[i - 1]?.charCodeAt(0) === 10
            accum.push(`${i === 0 || isPreviousMultiline ? '' : '\n'}${joinedOutput}\n`)
          } else {
            accum.push(joinedOutput)
          }

          return accum
        }, [])
        .join(`\n`)
    })
    .join('\n')
