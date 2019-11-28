import { ErrorObject } from 'ajv'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Problem = string
export type DetailedProblem = Pick<ErrorObject, 'dataPath' | 'message' | 'parentSchema' | 'data'>
export type Problems = (Problem | DetailedProblem)[]
export type Data = any
