import { NcdcHeaders } from './headers'
import { Body } from './body'
import { Type } from './type'

interface ResponseInput {
  code: number
  body: Data | undefined
  type: string | undefined
  headers: Record<string, string> | undefined
}

export class Response {
  public readonly code: number
  public readonly body: Body | undefined
  public readonly type: Type | undefined
  public readonly headers: NcdcHeaders

  constructor(input: ResponseInput) {
    this.code = input.code
    this.body = input.body ? new Body(input.body) : undefined
    this.type = input.type ? new Type(input.type) : undefined
    this.headers = new NcdcHeaders(input.headers)
  }

  public static CreateFromResponse = (response: Response): Response => {
    return new Response({
      code: response.code,
      body: response.body?.get(),
      headers: response.headers.getAll(),
      type: response.type?.get(),
    })
  }
}
