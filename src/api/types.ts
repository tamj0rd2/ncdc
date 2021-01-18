import { RequestInput } from '../config/resource/request'
import { ResponseInput } from '../config/resource/response'
import { Method, Request, Response } from '../config'
import * as z from 'zod'

export interface CommonConfig {
  tsconfigPath: string
  schemaPath?: string
  verbose?: boolean
}

export interface ResourceInput {
  name: string
  request: RequestInput
  response: ResponseInput
  serveOnly: boolean
}

export class Resource {
  public readonly name: string
  public readonly request: Request
  public readonly response: Response
  public readonly serveOnly: boolean

  public constructor(rawResource: ResourceInput) {
    this.name = rawResource.name
    this.request = new Request(rawResource.request)
    this.response = new Response(rawResource.response)
    this.serveOnly = rawResource.serveOnly
  }
}

abstract class Service {
  public readonly name: string
  public readonly resources: Resource[]
  public readonly port: number
  public readonly baseUrl: string

  constructor(serviceInput: ServiceInput) {
    const parsedService: ParsedService = serviceParser.parse(serviceInput)

    this.name = parsedService.name
    this.port = parsedService.port
    this.baseUrl = parsedService.baseUrl
    this.resources = parsedService.resources.flatMap((parsedResource) => {
      const { request } = parsedResource
      const resources: Resource[] = []

      resources.push(...request.endpoints.map((endpoint) => this.mapResource(parsedResource, endpoint)))
      if (request.serveEndpoints) resources.push(this.mapResource(parsedResource, request.serveEndpoints))

      return resources
    })
  }

  private mapResource = (parsedResource: ParsedResource, endpoint: string): Resource => {
    return new Resource({
      name: parsedResource.name,
      serveOnly: parsedResource.serveOnly,
      request: {
        ...parsedResource.request,
        body: parsedResource.request.body ?? undefined,
        type: parsedResource.request.type ?? undefined,
        endpoint: endpoint,
      },
      response: {
        ...parsedResource.response,
        body: this.getResponseBody(parsedResource.response),
        type: parsedResource.response.type ?? undefined,
      },
    })
  }

  protected abstract getResponseBody(response: ParsedResource['response']): Optional<Data>
}

export class ServeService extends Service {
  constructor(serviceInput: ServiceInput) {
    super(serviceInput)
  }

  protected getResponseBody(response: ParsedResource['response']): Optional<Data> {
    return response.serveBody ?? response.body
  }
}

export class TestService extends Service {
  constructor(serviceInput: ServiceInput) {
    super(serviceInput)
  }

  protected getResponseBody(response: ParsedResource['response']): Optional<Data> {
    return response.body
  }
}

export class GenerateService extends Service {
  constructor(serviceInput: ServiceInput) {
    super(serviceInput)
  }

  protected getResponseBody(response: ParsedResource['response']): Optional<Data> {
    return response.body
  }
}

const serviceParser = z.object({
  name: z.string().nonempty(),
  port: z.number(),
  baseUrl: z.string(),
  resources: z.array(
    z.object({
      name: z.string().nonempty(),
      serveOnly: z.transformer(z.boolean().optional(), z.boolean(), (val) => val ?? false),
      request: z.object({
        method: z.nativeEnum(Method),
        type: z.string().nonempty().optional(),
        headers: z.transformer(z.record(z.string()).optional(), z.record(z.string()), (val) => val ?? {}),
        endpoints: z.array(z.string()),
        serveEndpoints: z.string().nonempty().optional(),
        body: z.any().optional(),
      }),
      response: z.object({
        code: z.number(),
        type: z.string().nonempty().optional(),
        headers: z.transformer(z.record(z.string()).optional(), z.record(z.string()), (val) => val ?? {}),
        body: z.any().optional(),
        serveBody: z.any().optional(),
      }),
    }),
  ),
})

export type ServiceInput = z.input<typeof serviceParser>

type ParsedService = z.infer<typeof serviceParser>
type ParsedResource = ParsedService['resources'][number]
