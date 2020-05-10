import { TypeValidator } from '~validation'

export type HandleError = (error: { message: string }) => never
export type CreateTypeValidator = (
  tsconfigPath: string,
  force: boolean,
  schemaPath: Optional<string>,
) => TypeValidator
