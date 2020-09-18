import { Ajv } from 'ajv'
import { SchemaRetriever } from '~schema'
import { TypeValidationError } from './errors'

export default class TypeValidator {
  constructor(private readonly validator: Ajv, private readonly schemaRetriever: SchemaRetriever) {}

  public async assert(data: Data | undefined, type: string): Promise<void> {
    const jsonSchema = await this.schemaRetriever.load(type)
    const validator = this.validator.compile(jsonSchema)
    await validator(data)

    if (validator.errors?.length) {
      throw new TypeValidationError(validator.errors)
    }
  }
}
