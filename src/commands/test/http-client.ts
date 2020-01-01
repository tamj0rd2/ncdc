import { FetchResource, LoaderResponse } from '../../validation/validators'
import { AxiosError, AxiosInstance } from 'axios'
import { errorNoResponse, errorBadStatusCode, errorWrongStatusCode } from '../../messages'

export const createClient = (loader: AxiosInstance): FetchResource => async ({
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
