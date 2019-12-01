import { Data, DataObject } from './types'
import { ErrorObject } from 'ajv'

type ProblemContext = ErrorObject

const is = <T extends ProblemContext>(ctx: ProblemContext, prop: keyof T): ctx is T =>
  (ctx as T)[prop] !== undefined

export class DetailedProblem {
  public readonly path?: string
  public readonly message?: string
  public readonly data?: Data
  public readonly schema?: object

  public constructor(ctx: ProblemContext) {
    if (is<ErrorObject>(ctx, 'dataPath')) {
      const { dataPath, message, data, parentSchema } = ctx
      this.path = dataPath || undefined
      this.message = message
      this.data = this.mapData(data)
      this.schema = parentSchema
    }
  }

  private mapData = (data: Data): Data => {
    if (typeof data === 'string') return data.length >= 50 ? `${data.substring(0, 50)}...` : data
    if (typeof data === 'object')
      return Array.isArray(data)
        ? data.map(this.mapData)
        : Object.keys(data).reduce<DataObject>((accum, key) => {
            accum[key] = this.mapData(data[key])
            return accum
          }, {})
    return data
  }
}
