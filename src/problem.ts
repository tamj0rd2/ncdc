import { ErrorObject, ErrorParameters, TypeParams, RequiredParams, EnumParams } from 'ajv'
import { red, green } from 'chalk'
import { colorInspect } from '~commands/shared'

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

type CustomErrorObject<P extends ErrorParameters> = ErrorObject & { params: P }
const isErrorType = <P extends ErrorParameters>(
  error: ErrorObject,
  keyword: string,
): error is CustomErrorObject<P> => error.keyword === keyword

export default class Problem {
  public static readonly rootPath = '<root>'

  public readonly message: string
  public readonly value?: Data
  public readonly schema?: object
  public readonly problemType: ProblemType

  public readonly showValue: boolean = true
  public readonly showSchema: boolean = true

  public readonly definedBy?: string
  public readonly allowedValues?: string

  private readonly _path?: string

  public constructor(ctx: ProblemContext, problemType: ProblemType) {
    this.problemType = problemType

    if (is<ErrorObject>(ctx, 'dataPath')) {
      this._path = ctx.dataPath
      this.message = ctx.message as string
      this.value = this.mapData(ctx.data)
      this.schema = ctx.parentSchema
      this.definedBy = this.mapTypeName(ctx)

      if (isErrorType<TypeParams>(ctx, 'type')) {
        const actualType = typeof ctx.data
        this.message = `should have type ${green(ctx.params.type)} but has type ${red(actualType)}`

        if (actualType === 'object') this.showValue = false
        this.showSchema = false
      }

      if (isErrorType<RequiredParams>(ctx, 'required')) {
        this.showSchema = false
        this.showValue = false
      }

      if (isErrorType<EnumParams>(ctx, 'enum')) {
        this.allowedValues = colorInspect(ctx.params.allowedValues)
        this.showSchema = false
      }
    } else {
      this.message = ctx.message
      this.value = ctx.data ? this.mapData(ctx.data) : undefined
    }
  }

  public get path(): string {
    return `${Problem.rootPath}${this._path ?? ''}`
  }

  private mapData = (data: Data): Data => {
    if (data === null || data === undefined) return data
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

  private mapTypeName = (error: ErrorObject): Optional<string> => {
    const definitionMatches = error.schemaPath.match(/^#\/definitions\/([^/]+)/)
    if (definitionMatches) return definitionMatches[1]
  }
}
