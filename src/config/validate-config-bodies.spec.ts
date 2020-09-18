import { validateConfigBodies } from './validate-config-bodies'
import { SupportedMethod, Resource, ResourceBuilder } from './resource'
import { randomString, randomNumber, mockObj } from '~test-helpers'
import stripAnsi from 'strip-ansi'
import { TypeValidator } from '~validation'
import { Request, Response } from './resource'

jest.disableAutomock()

describe('validate config bodies', () => {
  const mockTypeValidator = mockObj<TypeValidator>({ assert: jest.fn() })
  const createResource = (withTypes = false, withBodies = false): Resource => ({
    name: randomString('name'),
    request: new Request({
      method: SupportedMethod.GET,
      endpoint: randomString('endpoint'),
      type: withTypes ? randomString('request-type') : undefined,
      body: withBodies ? randomString('request-body') : undefined,
      headers: undefined,
    }),
    response: new Response({
      code: randomNumber(),
      type: withTypes ? randomString('response-type') : undefined,
      body: withBodies ? randomString('response-body') : undefined,
      headers: undefined,
    }),
  })

  beforeEach(() => jest.resetAllMocks())

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const act = (resources: Resource[], forceRequestValidation = false) =>
    validateConfigBodies(resources, mockTypeValidator, forceRequestValidation)

  describe('when a config has a type and body', () => {
    it('calls the body validator with the correct arguments', async () => {
      // const resource = createResource(true, true)
      const resource = new ResourceBuilder()
        .withRequestBody('hi')
        .withResponseBody('bye')
        .withRequestType('requestType')
        .withResponseType('responseType')
        .build()

      await act([resource])

      expect(mockTypeValidator.assert).toBeCalledWith(resource.request.body!.get(), resource.request.type)
      expect(mockTypeValidator.assert).toBeCalledWith(resource.response.body!.get(), resource.response.type)
    })

    // This can happen if the original raw config had more than 1 endpoint, or an additional serve endpoint
    it('only runs the validation once in the case two transformed configs have the same name', async () => {
      const config1 = createResource(true, true)
      const config2 = { ...createResource(true, true), name: config1.name }

      await act([config1, config2])

      expect(mockTypeValidator.assert).toBeCalledTimes(2)
    })

    it('returns undefined when there are no validation issues', async () => {
      const config = createResource()

      const result = await act([config])

      expect(result).toBeUndefined()
    })

    it('returns errors if a config body fails type validation', async () => {
      const config = createResource(true, true)
      const error1 = randomString('error-message-1')
      const error2 = randomString('error-message-2')
      mockTypeValidator.assert.mockRejectedValueOnce(new Error(error1))
      mockTypeValidator.assert.mockRejectedValueOnce(new Error(error2))

      const result = await act([config])

      const errPart1 = `Config ${config.name} request body failed type validation:\n${error1}`
      const errPart2 = `Config ${config.name} response body failed type validation:\n${error2}`
      expect(stripAnsi(result!)).toEqual(`${errPart1}\n${errPart2}`)
    })
  })

  describe('when there is a request type but no request body', () => {
    const config = createResource()
    config.request = new Request({
      ...config.request,
      body: undefined,
      type: randomString('yo'),
      endpoint: randomString('endpoint'),
      headers: undefined,
      method: SupportedMethod.DELETE,
    })

    it('does not validate when forceRequestValidation is false', async () => {
      await act([config])

      expect(mockTypeValidator.assert).not.toBeCalled()
    })

    it('validates when forceRequestValidation is true', async () => {
      const result = await act([config], true)

      expect(mockTypeValidator.assert).toBeCalledWith(undefined, config.request.type)
      expect(result).toBeUndefined()
    })
  })

  it('skips request and response type validation when there are no types', async () => {
    const config = createResource(false, true)

    await act([config])

    expect(mockTypeValidator.assert).not.toBeCalled()
  })
})
