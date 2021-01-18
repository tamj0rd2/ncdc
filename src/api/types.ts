import { ResourceInput } from '../config'

export interface CommonConfig {
  tsconfigPath: string
  schemaPath?: string
  verbose?: boolean
}

export interface Service {
  resources: ResourceInput[]
  port: number
}

export type Services = Record<string, Service>
