import { OutgoingHttpHeaders, IncomingHttpHeaders } from 'http'

export interface Config {
  name: string
  serveOnly: boolean
  request: {
    method: string
    type?: string
    endpoints?: string[]
    serveEndpoint?: string
    headers?: OutgoingHttpHeaders
    body?: unknown
  }
  response: {
    code: number
    headers?: IncomingHttpHeaders
    type?: string
    body?: unknown
    serveBody?: unknown
    serveBodyPath?: string
  }
}

export class ConfigBuilder {
  private config: Config = {
    name: 'Books',
    serveOnly: false,
    request: {
      method: 'GET',
      endpoints: ['/api/books/123', '/api/books/456'],
      serveEndpoint: '/api/books/*',
    },
    response: {
      code: 200,
      serveBody: {
        ISBN: '9780141187761',
        ISBN_13: '978 - 0141187761',
        author: 'George Orwell',
        title: '1984 Nineteen Eighty- Four',
      },
    },
  }

  public withName(name: string): ConfigBuilder {
    this.config.name = name
    return this
  }

  public withMethod(method: string): ConfigBuilder {
    this.config.request.method = method
    return this
  }

  public withServeOnly(serveOnly: boolean): ConfigBuilder {
    this.config.serveOnly = serveOnly
    return this
  }

  public withRequestHeaders(headers: OutgoingHttpHeaders): ConfigBuilder {
    this.config.request.headers = headers
    return this
  }

  public withRequestType(type: string): ConfigBuilder {
    this.config.request.type = type
    return this
  }

  public withRequestBody(body: unknown): ConfigBuilder {
    this.config.request.body = body
    return this
  }

  public withCode(code: number): ConfigBuilder {
    this.config.response.code = code
    return this
  }

  public withResponseBody(body: unknown): ConfigBuilder {
    if (!body) {
      delete this.config.response.body
      return this
    }

    delete this.config.response.serveBody
    this.config.response.body = body
    return this
  }

  public withServeBody(serveBody: unknown): ConfigBuilder {
    if (!serveBody) {
      delete this.config.response.serveBody
      return this
    }

    this.config.response.serveBody = serveBody
    return this
  }

  public withServeBodyPath(name = 'response'): ConfigBuilder {
    if (this.config.response.serveBodyPath) {
      throw new Error('Response serveBodyPath already set to ' + this.config.response.serveBodyPath)
    }

    this.config.response.serveBodyPath = `./fixtures/${name}.json`
    return this
  }

  public withResponseType(typeName: string): ConfigBuilder {
    if (this.config.response.type) {
      throw new Error('Response type already set to ' + this.config.response.type)
    }

    this.config.response.type = typeName
    return this
  }

  public withEndpoints(...endpoints: string[]): ConfigBuilder {
    this.config.request.endpoints = endpoints
    return this
  }

  public withResponseHeaders(headers: IncomingHttpHeaders): ConfigBuilder {
    this.config.response.headers = headers
    return this
  }

  public build(): Config {
    return this.config
  }
}
