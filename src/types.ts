// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Data = any
export interface DetailedProblem {
  dataPath: string
  expectedType: string
  actualType: string
  data: Data
}
export type Problem = string
export type Problems = (Problem | DetailedProblem)[]
