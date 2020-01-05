import { AxiosInstance, AxiosError, AxiosResponse } from 'axios'
import { Config } from '../../config/config'
import * as _messages from '../../messages'
import { FetchResource } from '../../validation/validators'
import { createHttpClient } from './http-client'
import { mockObj } from '../../test-helpers'

jest.mock('../../messages')
jest.mock('../../problem')

describe('CDC Tester', () => {
  const loader = mockObj<AxiosInstance>({ get: jest.fn(), post: jest.fn() })
  const messages = mockObj(_messages)

  let fetchResource: FetchResource

  beforeEach(() => {
    jest.resetAllMocks()
    loader.defaults = { baseURL: 'some url' }
    fetchResource = createHttpClient(loader)
  })

  it('calls the loader with the correct args for a GET request', async () => {
    const config: Partial<Config> = {
      request: {
        method: 'GET',
        endpoint: '/blah',
      },
      response: { code: 200 },
    }
    loader.get.mockResolvedValue({ status: 200 })

    await fetchResource(config as Config)

    expect(loader.get).toBeCalledWith('/blah')
  })

  it('calls the loader with the correct args for a POST request', async () => {
    const config: Partial<Config> = {
      request: {
        method: 'POST',
        endpoint: '/blah',
        body: 'Ello',
      },
      response: { code: 200 },
    }
    loader.post.mockResolvedValue({ status: 200 })

    await fetchResource(config as Config)

    expect(loader.post).toBeCalledWith('/blah', 'Ello')
  })

  describe('error calling service', () => {
    it('throws an error when there is no service response', async () => {
      const config: Partial<Config> = {
        request: {
          method: 'GET',
          endpoint: '/some/endpoint',
        },
        response: {
          code: 200,
        },
      }

      const endpoint = '/some/endpoint'
      const baseURL = 'my-site.com'
      loader.defaults = { baseURL }

      loader.get.mockRejectedValue(new Error('welp'))
      messages.errorNoResponse.mockReturnValue('error msg')

      await expect(fetchResource(config as Config)).rejects.toThrowError('error msg')
      expect(messages.errorNoResponse).toBeCalledWith(baseURL + endpoint)
    })

    it('throws an error when the response code does not match expected', async () => {
      const config: Partial<Config> = {
        request: {
          method: 'GET',
          endpoint: '/some/endpoint',
        },
        response: { code: 404 },
      }

      const baseURL = 'woah.dude'
      loader.defaults = { baseURL }

      const response: Partial<AxiosResponse> = { status: 503 }
      const error: Partial<AxiosError> = { response: response as AxiosResponse }
      loader.get.mockRejectedValue(error)
      messages.errorWrongStatusCode.mockReturnValue('error msg2')

      await expect(fetchResource(config as Config)).rejects.toThrowError('error msg2')
      expect(messages.errorWrongStatusCode).toBeCalledWith(baseURL + config.request!.endpoint, 404, 503)
    })

    it('returns the response if the response code matches', async () => {
      const config: Partial<Config> = {
        request: {
          method: 'GET',
          endpoint: 'endpoint',
        },
        response: { code: 404 },
      }
      const response: Partial<AxiosResponse> = { status: 404, data: 'get out' }
      const error: Partial<AxiosError> = { response: response as AxiosResponse }
      loader.get.mockRejectedValue(error)

      const result = await fetchResource(config as Config)

      expect(result).toBe(response)
    })
  })
})
