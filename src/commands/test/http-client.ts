import { FetchResource, LoaderResponse } from '~validation'
import fetch, { RequestInit, Response } from 'node-fetch'

export const createHttpClient = (baseUrl: string): FetchResource => async ({
  request,
  response,
}): Promise<LoaderResponse> => {
  const { method, endpoint, body } = request
  const fullUrl = `${baseUrl}${endpoint}`

  const requestInit: RequestInit = {
    method,
    body: body && typeof body === 'object' ? JSON.stringify(body) : body?.toString(),
  }

  let res: Response
  try {
    res = await fetch(fullUrl, requestInit)
  } catch (err) {
    return { status: 0 }
  }

  let data: Data
  if (response.headers?.['content-type']?.toString().includes('application/json')) {
    data = await res.json()
  } else {
    data = await res.text()
  }

  return { status: res.status, data }
}
