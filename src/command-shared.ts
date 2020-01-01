import Main from './main'

export type HandleError = (error: Error) => never
export type CreateMain = (allErrors: boolean, tsconfigPath: string, schemaPath: Optional<string>) => Main
