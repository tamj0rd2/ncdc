import { ErrorObject } from 'ajv'

export type DetailedProblem = Pick<ErrorObject, 'dataPath' | 'message' | 'parentSchema' | 'data'>
export type Data = any
export type SupportedMethod = 'GET'
