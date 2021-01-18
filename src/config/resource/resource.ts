import { Request, RequestInput } from './request'
import { Response, ResponseInput } from './response'

export class Resource {
  public readonly name: string
  public readonly request: Request
  public readonly response: Response

  public constructor(rawResource: ResourceInput) {
    this.name = rawResource.name
    this.request = new Request(rawResource.request)
    this.response = new Response(rawResource.response)
  }
}

export interface ResourceInput {
  name: string
  request: RequestInput
  response: ResponseInput
}
