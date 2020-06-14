import { Ajv } from 'ajv'
import { SchemaRetriever } from '~schema'
import { inspect } from 'util'
import { blue } from 'chalk'

export type TypeValidationFailure = {
  success: false
  errors: string[]
}

export type TypeValidationResult =
  | {
      success: true
    }
  | TypeValidationFailure

export default class TypeValidator {
  constructor(private readonly validator: Ajv, private readonly schemaRetriever: SchemaRetriever) {}

  public async validate(data: Data | undefined, type: string): Promise<TypeValidationResult> {
    const jsonSchema = await this.schemaRetriever.load(type)
    const validator = this.validator.compile(jsonSchema)
    const isValid = validator(data)

    if (isValid || !validator.errors) return { success: true }
    return {
      success: false,
      errors: validator.errors.map((e) => {
        const baseMessage = `${blue.bold('<root>' + e.dataPath)} ${e.message?.replace(/'(.*)'/, blue('$&'))}`
        if (e.keyword === 'enum' && 'allowedValues' in e.params) {
          return `${baseMessage} ${this.formatData(e.params.allowedValues)} but received ${this.formatData(
            e.data,
          )}`
        }

        if (e.keyword === 'type') {
          return `${baseMessage} but got ${typeof e.data}`
        }

        return baseMessage
      }),
    }
  }

  private formatData(data: Data): string {
    return inspect(data, false, 1, true)
  }
}
