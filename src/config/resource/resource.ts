import type { Request } from './request'
import type { Response } from './response'

export interface Resource {
  name: string
  request: Request
  response: Response
}
