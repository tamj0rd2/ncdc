import fetch from 'node-fetch'
import Bottleneck from 'bottleneck'
import { Resource } from '~config/types'

export type LoaderResponse = { status: number; data?: Data }
export type FetchResource = (config: Resource) => Promise<LoaderResponse>

export const createHttpClient = (baseUrl: string, timeout?: number, rateLimitMs?: number): FetchResource => {
  const innerHttpClient = rateLimitMs
    ? new Bottleneck({ minTime: rateLimitMs, maxConcurrent: 1 }).wrap(fetch)
    : fetch

  return async ({ request, response }): Promise<LoaderResponse> => {
    const { body } = request

    const res = await innerHttpClient(request.formatUrl(baseUrl), {
      method: request.method,
      body: body && typeof body === 'object' ? JSON.stringify(body) : body?.toString(),
      headers: request.headers.getAll(),
      timeout,
    })

    const acceptHeader = request.headers.get('accept')
    if (acceptHeader) {
      const useJson = acceptHeader.includes('application/json')
      return { status: res.status, data: useJson ? await res.json() : await res.text() }
    }

    const contentTypeHeader = response.headers.get('content-type')
    if (contentTypeHeader) {
      const useJson = contentTypeHeader.includes('application/json')
      return { status: res.status, data: useJson ? await res.json() : await res.text() }
    }

    const data = await res.text()
    try {
      return { status: res.status, data: JSON.parse(data) }
    } catch {
      return { status: res.status, data }
    }
  }
}
