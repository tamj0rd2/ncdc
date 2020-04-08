import { FetchResource, LoaderResponse } from '~validation'
import { AxiosError, AxiosInstance } from 'axios'
import { errorNoResponse, errorBadStatusCode, errorWrongStatusCode } from '~messages'

export const createHttpClient = (loader: AxiosInstance): FetchResource => async ({
  request,
  response,
}): Promise<LoaderResponse> => {
  const { method, endpoint, body } = request
  const { code } = response
  try {
    switch (method) {
      case 'GET':
        return await loader.get(endpoint)
      case 'POST':
        return await loader.post(endpoint, body)
      case 'PUT':
        return await loader.put(endpoint, body)
      case 'DELETE':
        return await loader.delete(endpoint)
      case 'PATCH':
        return await loader.patch(endpoint, body)
      case 'OPTIONS':
        return await loader.options(endpoint)
      case 'HEAD':
        return await loader.head(endpoint)
    }
  } catch (err) {
    const axiosErr = err as AxiosError
    const fullUri = loader.defaults.baseURL + endpoint

    if (!axiosErr.response) throw new Error(errorNoResponse(fullUri))

    if (!code) throw new Error(errorBadStatusCode(fullUri, axiosErr.response.status))

    if (code !== axiosErr.response.status)
      throw new Error(errorWrongStatusCode(fullUri, code, axiosErr.response.status))

    return axiosErr.response
  }
}
