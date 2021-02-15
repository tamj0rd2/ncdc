import { ErrorObject } from 'ajv'
import { blue } from 'chalk'
import { inspect } from 'util'

export class TypeValidationMismatchError extends Error {
  constructor(errors: ErrorObject[]) {
    super(errors.map(TypeValidationMismatchError.mapErrorMessage).join('\n'))
    this.name = 'TypeValidationError'
    Object.setPrototypeOf(this, TypeValidationMismatchError.prototype)
  }

  private static mapErrorMessage(err: ErrorObject): string {
    const dataPath = err.dataPath.replace(/\//g, '.')
    const baseMessage = `${blue.bold('<root>' + dataPath)} ${err.message?.replace(/'(.*)'/, blue('$&'))}`

    if (err.keyword === 'enum' && 'allowedValues' in err.params) {
      return `${baseMessage} ${TypeValidationMismatchError.formatData(
        err.params.allowedValues,
      )} but received ${TypeValidationMismatchError.formatData(err.data)}`
    }

    if (err.keyword === 'type') {
      return `${baseMessage} but got ${TypeValidationMismatchError.getPrimitiveType(err.data)}`
    }

    return baseMessage
  }

  private static getPrimitiveType(data: unknown): string {
    if (data === null) return 'null'
    if (Array.isArray(data)) return 'array'
    return typeof data
  }

  private static formatData(data: Data | unknown): string {
    return inspect(data, false, 1, true)
  }
}
