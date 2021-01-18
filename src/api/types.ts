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

export enum UseCase {
  Serving,
  Testing,
  Generating,
}

export class Service {
  public readonly name: string
  public readonly resources: Resource[]
  public readonly port: number

  constructor(serviceInput: ServiceInput, useCase: UseCase) {
    const parsedService: ParsedService = serviceParser.parse(serviceInput)

    this.name = parsedService.name
    this.port = parsedService.port
    this.resources = parsedService.resources.flatMap((parsedResource) => {
      const { request } = parsedResource
      const resources: Resource[] = []

      resources.push(
        ...request.endpoints.map((endpoint) => this.mapResource(parsedResource, endpoint, useCase)),
      )
      if (request.serveEndpoints)
        resources.push(this.mapResource(parsedResource, request.serveEndpoints, useCase))

      return resources
    })
  }

  private mapResource = (parsedResource: ParsedResource, endpoint: string, useCase: UseCase): Resource => {
    const getResponseBody = (): Optional<Data> => {
      switch (useCase) {
        case UseCase.Serving:
          return parsedResource.response.serveBody ?? parsedResource.response.body
        case UseCase.Testing:
          return parsedResource.response.body
        case UseCase.Generating:
          return undefined
      }
    }

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
        body: getResponseBody(),
        type: parsedResource.response.type ?? undefined,
      },
    })
  }
}

const serviceParser = z.object({
  name: z.string().nonempty(),
  port: z.number(),
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
