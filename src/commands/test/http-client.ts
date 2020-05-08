import { FetchResource, LoaderResponse } from '~validation'
import fetch, { Response } from 'node-fetch'

export const createHttpClient = (baseUrl: string): FetchResource => async ({
  request,
  response,
}): Promise<LoaderResponse> => {
  const { body } = request
  const fullUrl = `${baseUrl}${request.endpoint}`

  let res: Response
  try {
    res = await fetch(fullUrl, {
      method: request.method,
      body: body && typeof body === 'object' ? JSON.stringify(body) : body?.toString(),
      headers: request.headers,
    })
  } catch (err) {
    return { status: 0 }
  }

  if (request.headers?.['accept']) {
    const useJson = request.headers['accept'].includes('application/json')
    return { status: res.status, data: useJson ? await res.json() : await res.text() }
  }

  if (response.headers?.['content-type']) {
    const useJson = response.headers['content-type'].includes('application/json')
    return { status: res.status, data: useJson ? await res.json() : await res.text() }
  }

  try {
    return { status: res.status, data: await res.json() }
  } catch {
    return { status: res.status, data: await res.text() }
  }
}
