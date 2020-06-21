import fetch from 'node-fetch'
import { TestConfig } from './config'
import Bottleneck from 'bottleneck'

export type LoaderResponse = { status: number; data?: Data }
export type FetchResource = (config: TestConfig) => Promise<LoaderResponse>

export const createHttpClient = (baseUrl: string, timeout?: number, rateLimitMs?: number): FetchResource => {
  const innerHttpClient = rateLimitMs
    ? new Bottleneck({ minTime: rateLimitMs, maxConcurrent: 1 }).wrap(fetch)
    : fetch

  return async ({ request, response }): Promise<LoaderResponse> => {
    const { body } = request
    const fullUrl = `${baseUrl}${request.endpoint}`

    const res = await innerHttpClient(fullUrl, {
      method: request.method,
      body: body && typeof body === 'object' ? JSON.stringify(body) : body?.toString(),
      headers: request.headers,
      timeout,
    })

    if (request.headers?.['accept']) {
      const useJson = request.headers['accept'].includes('application/json')
      return { status: res.status, data: useJson ? await res.json() : await res.text() }
    }

    if (response.headers?.['content-type']) {
      const useJson = response.headers['content-type'].includes('application/json')
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
