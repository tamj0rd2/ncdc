import { validateConfigBodies } from './validate-config-bodies'
import { ResourceBuilder } from './resource'
import { randomString, mockObj } from '~test-helpers'
import stripAnsi from 'strip-ansi'
import { TypeValidator } from '~validation'
import { TypeValidationMismatchError } from '~validation/errors'

jest.disableAutomock()

describe('validate config bodies', () => {
  function createTestDeps() {
    const mockTypeValidator = mockObj<TypeValidator>({ assert: jest.fn() })
    return {
      mockTypeValidator,
    }
  }

  afterEach(() => jest.resetAllMocks())

  describe('when a config has a type and body', () => {
    it('calls the body validator with the correct arguments', async () => {
      const { mockTypeValidator } = createTestDeps()
      const resource = new ResourceBuilder()
        .withRequestBody('hi')
        .withResponseBody('bye')
        .withRequestType('requestType')
        .withResponseType('responseType')
        .build()

      await validateConfigBodies([resource], mockTypeValidator, false)

      expect(mockTypeValidator.assert).toBeCalledWith(resource.request.body!.get(), resource.request.type)
      expect(mockTypeValidator.assert).toBeCalledWith(resource.response.body!.get(), resource.response.type)
    })

    // This can happen if the original raw config had more than 1 endpoint, or an additional serve endpoint
    it('only runs the validation once in the case two transformed configs have the same name', async () => {
      const { mockTypeValidator } = createTestDeps()
      const config1 = new ResourceBuilder().withRandomTypes().withRandomBodies().build()
      const config2 = new ResourceBuilder()
        .withRandomTypes()
        .withRandomBodies()
        .withName(config1.name)
        .build()

      await validateConfigBodies([config1, config2], mockTypeValidator, false)

      expect(mockTypeValidator.assert).toBeCalledTimes(2)
    })

    it('returns undefined when there are no validation issues', async () => {
      const { mockTypeValidator } = createTestDeps()
      const config = ResourceBuilder.random()

      const result = await validateConfigBodies([config], mockTypeValidator, false)

      expect(result).toBeUndefined()
    })

    it('returns errors if a config body does not match the correct type', async () => {
      const { mockTypeValidator } = createTestDeps()
      const config = new ResourceBuilder().withRandomTypes().withRandomBodies().build()

      const error1 = new TypeValidationMismatchError([])
      error1.message = randomString('error1')
      const error2 = new TypeValidationMismatchError([])
      error2.message = randomString('error2')
      mockTypeValidator.assert.mockRejectedValueOnce(error1)
      mockTypeValidator.assert.mockRejectedValueOnce(error2)

      const result = await validateConfigBodies([config], mockTypeValidator, false)

      const expectedError = [
        `Config ${config.name} request body failed type validation:\n${error1.message}`,
        `Config ${config.name} response body failed type validation:\n${error2.message}`,
      ].join('\n')
      expect(stripAnsi(result!)).toEqual(expectedError)
    })

    it('rethrows errors that are thrown while validating a body matches a type', async () => {
      const { mockTypeValidator } = createTestDeps()
      const config = new ResourceBuilder().withRandomTypes().withRandomBodies().build()
      const error1 = new Error('error-message-1')
      mockTypeValidator.assert.mockRejectedValueOnce(error1)
      mockTypeValidator.assert.mockRejectedValueOnce(new Error('error-message-2'))

      await expect(validateConfigBodies([config], mockTypeValidator, false)).rejects.toThrowError(error1)
    })
  })

  describe('when there is a request type but no request body', () => {
    it('does not validate when forceRequestValidation is false', async () => {
      const config = new ResourceBuilder().withRequestType(randomString('requestType')).build()
      const { mockTypeValidator } = createTestDeps()

      await validateConfigBodies([config], mockTypeValidator, false)

      expect(mockTypeValidator.assert).not.toBeCalled()
    })

    it('validates when forceRequestValidation is true', async () => {
      const config = new ResourceBuilder().withRequestType(randomString('requestType')).build()
      const { mockTypeValidator } = createTestDeps()

      const result = await validateConfigBodies([config], mockTypeValidator, true)

      expect(mockTypeValidator.assert).toBeCalledWith(undefined, config.request.type)
      expect(result).toBeUndefined()
    })
  })

  it('skips request and response type validation when there are no types', async () => {
    const { mockTypeValidator } = createTestDeps()
    const config = new ResourceBuilder().withRandomBodies().build()

    await validateConfigBodies([config], mockTypeValidator, false)

    expect(mockTypeValidator.assert).not.toBeCalled()
  })
})
