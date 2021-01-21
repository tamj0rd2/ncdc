import Ajv from 'ajv'
import { Type } from '~config/resource/type'
import { SchemaRetriever } from '~schema'
import { TypeValidationMismatchError } from './errors'

export default class TypeValidator {
  constructor(private readonly validator: Ajv, private readonly schemaRetriever: SchemaRetriever) {}

  public async assert(data: Data | undefined, type: Type): Promise<void> {
    const jsonSchema = await this.schemaRetriever.load(type)
    const validator = this.validator.compile(jsonSchema)
    await validator(data)

    if (validator.errors?.length) {
      throw new TypeValidationMismatchError(validator.errors)
    }
  }
}
