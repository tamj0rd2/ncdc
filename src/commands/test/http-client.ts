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

  let data: Data
  if (response.headers?.['content-type']?.toString().includes('application/json')) {
    data = await res.json()
  } else {
    data = await res.text()
  }

  return { status: res.status, data }
}
