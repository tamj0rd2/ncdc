import { Request } from './request'
import { Response } from './response'

export interface Resource {
  name: string
  request: Request
  response: Response
}
