import { ErrorObject } from 'ajv'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DetailedProblem = Pick<ErrorObject, 'dataPath' | 'message' | 'parentSchema' | 'data'>
export type Data = any
export type SupportedMethod = 'GET'
