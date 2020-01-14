import { ErrorObject } from 'ajv'

interface CustomContext {
  data?: Data
  message: string
}

export type ProblemContext = ErrorObject | CustomContext
export enum ProblemType {
  Request = 'Request',
  Response = 'Response',
}

const is = <T extends ProblemContext>(ctx: ProblemContext, prop: keyof T): ctx is T =>
  (ctx as T)[prop] !== undefined

export default class Problem {
  private readonly _path?: string
  public readonly message: string
  public readonly data?: Data
  public readonly schema?: object
  public readonly problemType: ProblemType

  public constructor(ctx: ProblemContext, problemType: ProblemType) {
    this.problemType = problemType

    if (is<ErrorObject>(ctx, 'dataPath')) {
      this._path = ctx.dataPath
      this.message = ctx.message as string
      this.data = this.mapData(ctx.data)
      this.schema = ctx.parentSchema
    } else {
      this.message = ctx.message
      this.data = ctx.data ? this.mapData(ctx.data) : undefined
    }
  }

  public get path(): string {
    return `<root>${this._path ?? ''}`
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
