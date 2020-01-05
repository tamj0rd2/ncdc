import TypeValidator from '~validation/type-validator'

export type HandleError = (error: Error) => never
export type CreateTypeValidator = (
  allErrors: boolean,
  tsconfigPath: string,
  schemaPath?: string,
) => TypeValidator
