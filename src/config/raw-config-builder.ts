import { randomString, randomNumber } from '~test-helpers'

export interface RawConfig {
  name?: string
  serveOnly?: boolean
  request: {
    method?: string
    endpoints?: string | string[]
    headers?: Record<string, string>
    serveEndpoint?: string
    type?: string
    body?: unknown
    bodyPath?: string
    [index: string]: unknown
  }
  response: {
    code?: number
    body?: unknown
    bodyPath?: string
    serveBody?: unknown
    serveBodyPath?: string
    [index: string]: unknown
  }
}

export class RawConfigBuilder {
  private config: RawConfig = {
    name: randomString('name'),
    request: {
      endpoints: randomString('/endpoint'),
      method: 'GET',
    },
    response: {
      code: randomNumber(),
    },
  }

  public static random(): RawConfig {
    return new RawConfigBuilder().build()
  }

  public withName(name: string | undefined): RawConfigBuilder {
    if (name !== undefined) this.config.name = name
    else delete this.config.name
    return this
  }

  public withServeOnly(serveOnly: boolean | undefined): RawConfigBuilder {
    if (serveOnly !== undefined) this.config.serveOnly = serveOnly
    else delete this.config.serveOnly
    return this
  }

  public withRequest(request: RawConfig['request'] | undefined): RawConfigBuilder {
    if (request !== undefined) this.config.request = request
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    else delete this.config.request
    return this
  }

  public withRequestMethod(method: string | undefined): RawConfigBuilder {
    if (method !== undefined) this.config.request.method = method
    else delete this.config.request.method
    return this
  }

  public withRequestHeaders(headers: Record<string, string> | undefined): RawConfigBuilder {
    if (headers !== undefined) this.config.request.headers = headers
    else delete this.config.request.headers
    return this
  }

  public withRequestEndpoints(endpoints: string | string[] | undefined): RawConfigBuilder {
    if (endpoints !== undefined) {
      this.config.request = {
        ...this.config.request,
        endpoints,
      }
    } else {
      delete this.config.request.endpoints
    }
    return this
  }

  public withRequestServeEndpoint(serveEndpoint: string | undefined): RawConfigBuilder {
    if (serveEndpoint !== undefined) {
      this.config.request = {
        ...this.config.request,
        serveEndpoint,
      }
    } else {
      delete this.config.request.serveEndpoint
    }
    return this
  }

  public withRequestBody(body: unknown | undefined): RawConfigBuilder {
    if (body !== undefined) this.config.request = { ...this.config.request, body: body }
    else delete this.config.request.body
    return this
  }

  public withRequestBodyPath(bodyPath: string | undefined): RawConfigBuilder {
    if (bodyPath !== undefined) this.config.request = { ...this.config.request, bodyPath: bodyPath }
    else delete this.config.request.bodyPath
    return this
  }

  public withRequestType(type: string | undefined): RawConfigBuilder {
    if (type !== undefined) {
      this.config.request = {
        ...this.config.request,
        type,
      }
    } else {
      delete this.config.request.type
    }
    return this
  }

  public withResponse(response: RawConfig['response'] | undefined): RawConfigBuilder {
    if (response !== undefined) this.config.response = response
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    else delete this.config.response
    return this
  }

  public withResponseBody(body: unknown | undefined): RawConfigBuilder {
    if (body !== undefined) this.config.response = { ...this.config.response, body: body }
    else delete this.config.response.body
    return this
  }

  public withResponseBodyPath(bodyPath: string | undefined): RawConfigBuilder {
    if (bodyPath !== undefined) this.config.response = { ...this.config.response, bodyPath: bodyPath }
    else delete this.config.response.bodyPath
    return this
  }

  public withResponseServeBody(serveBody: unknown | undefined): RawConfigBuilder {
    if (serveBody !== undefined) this.config.response = { ...this.config.response, serveBody: serveBody }
    else delete this.config.response.serveBody
    return this
  }

  public withResponseServeBodyPath(serveBodyPath: string | undefined): RawConfigBuilder {
    if (serveBodyPath !== undefined)
      this.config.response = { ...this.config.response, serveBodyPath: serveBodyPath }
    else delete this.config.response.serveBodyPath
    return this
  }

  public withResponseType(type: string | undefined): RawConfigBuilder {
    if (type !== undefined) {
      this.config.response = {
        ...this.config.response,
        type,
      }
    } else {
      delete this.config.response.type
    }
    return this
  }

  public build(): RawConfig {
    return this.config
  }
}
