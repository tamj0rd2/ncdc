import { Ajv } from 'ajv'
import { SchemaRetriever } from '~schema'
import Problem, { ProblemType } from '~problem'
import { shouldBe } from '~messages'
import { inspect } from 'util'
import { blue } from 'chalk'

export class TypeValidationError extends Error {
  public readonly problems: ROPopulatedArray<Problem>

  constructor(problems: PopulatedArray<Problem>) {
    super('Failed to validate type')
    Object.setPrototypeOf(this, new.target.prototype)
    this.name = 'TypeValidationError'
    this.problems = problems
  }
}

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

  public async getProblems(
    data: Optional<Data>,
    expectedType: string,
    problemType: ProblemType,
  ): Promise<Optional<PopulatedArray<Problem>>> {
    switch (expectedType) {
      case 'string':
        return this.mapSimpleProblem('string', data, problemType)
      case 'number':
        return this.mapSimpleProblem('number', data, problemType)
      case 'boolean':
        return this.mapSimpleProblem('boolean', data, problemType)
      case 'object':
        return this.mapSimpleProblem('object', data, problemType)
      default:
        const jsonSchema = await this.schemaRetriever.load(expectedType)
        const validator = this.validator.compile(jsonSchema)
        const isValid = validator(data)

        if (isValid || !validator.errors) return
        return validator.errors.map((error) => new Problem(error, problemType)) as PopulatedArray<Problem>
    }
  }

  public async validate(data: Data, type: string): Promise<TypeValidationResult> {
    const jsonSchema = await this.schemaRetriever.load(type)
    const validator = this.validator.compile(jsonSchema)
    const isValid = validator(data)

    if (isValid || !validator.errors) return { success: true }
    return {
      success: false,
      errors: validator.errors.map((e) => {
        const baseMessage = `${blue.bold('<root>' + e.dataPath)} ${e.message?.replace(/'(.*)'/, blue('$&'))}`
        if (e.keyword === 'enum' && 'allowedValues' in e.params) {
          return `${baseMessage}: ${inspect(e.params.allowedValues, false, 1, true)}`
        }

        if (e.keyword === 'type') {
          return `${baseMessage} but got ${typeof e.data}`
        }

        return baseMessage
      }),
    }
  }

  private mapSimpleProblem(
    expectedType: string,
    data: Optional<Data>,
    type: ProblemType,
  ): Optional<PopulatedArray<Problem>> {
    const actualType = typeof data
    if (actualType !== expectedType)
      return [new Problem({ data, message: shouldBe('type', expectedType, actualType) }, type)]
  }
}
