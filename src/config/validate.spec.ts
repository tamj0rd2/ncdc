import { validateRawConfig, ValidationFailure, ValidationSuccess, validateConfigBodies } from './validate'
import strip from 'strip-ansi'
import { SupportedMethod, Resource, ResourceBuilder } from './resource'
import { randomString, randomNumber, mockObj } from '~test-helpers'
import stripAnsi from 'strip-ansi'
import { TypeValidator } from '~validation'
import { Request, Response } from './resource'

jest.disableAutomock()

describe('validate', () => {
  const expectValidationErors = (config?: object | object[], ...expectedErrors: string[]): string[] => {
    const { success, errors } = validateRawConfig(
      Array.isArray(config) ? config : [config],
    ) as ValidationFailure
    expect(success).toBe(false)

    const strippedErrors = errors.map((e) => strip(e))
    for (const expectedError of expectedErrors) {
      expect(strippedErrors).toContain(expectedError)
    }
    return errors
  }

  const expectNotToGetErrorsConcerning = (
    config?: object | object[],
    ...unexpectedStrings: string[]
  ): ValidationSuccess | ValidationFailure => {
    const validationResult = validateRawConfig(Array.isArray(config) ? config : [config])
    if (validationResult.success) return validationResult

    const allErrors = strip(validationResult.errors.join('\n'))
    for (const unexpectedString of unexpectedStrings) {
      expect(allErrors).not.toContain(unexpectedString)
    }

    return validationResult
  }

  it('returns a helpful error if the config is empty', () => {
    const { success, errors } = validateRawConfig(undefined) as ValidationFailure

    expect(success).toBe(false)
    expect(errors).toContain('Your config file cannot be empty')
    expect(errors).toHaveLength(1)
  })

  it('returns an error when the config file is an empty array', () => {
    const { success, errors } = validateRawConfig([]) as ValidationFailure

    expect(success).toBe(false)
    expect(errors).toContain('Your config file must contain at least 1 config item')
  })

  it('returns an error when the config file has an empty config item', () => {
    const errors = expectValidationErors(undefined, 'config[0] must not be a sparse array item')
    expect(errors).toHaveLength(1)
  })

  it('returns an error if config name is missing', () => {
    expectValidationErors({}, 'config[0].name is required')
  })

  it('shows the config name in errors if supplied', () => {
    const config = { name: 'Yo fam', fake: 'property' }
    expectValidationErors(config, 'config[Yo fam].fake is not allowed')
  })

  it('accepts configs with different names', () => {
    const configs = [{ name: 'Noice' }, { name: 'Toight' }]
    expectNotToGetErrorsConcerning(
      configs,
      'config[Noice] must have a unique name',
      'config[Toight] must have a unique name',
    )
  })

  it('returns an error if any configs have the same name', () => {
    const configs = [{ name: 'Noice' }, { name: 'Noice' }]
    expectValidationErors(configs, 'config[Noice] must have a unique name')
  })

  describe('request', () => {
    it('returns an error if request is missing', () => {
      expectValidationErors({}, 'config[0].request is required')
    })

    it('returns an error if request is not an object', () => {
      const config = { request: 'ayy' }
      expectValidationErors(config, 'config[0].request must be of type object')
    })

    it('does not allow unknown fields', () => {
      const config = { request: { what: 'the' } }
      expectValidationErors(config, 'config[0].request.what is not allowed')
    })

    describe('request.method', () => {
      it.each(Object.values(SupportedMethod).map((x) => [x]))('allows method %s', (method) => {
        const config = { request: { method } }
        expectNotToGetErrorsConcerning(config, 'request.method')
      })

      it('allows lower case versions of the methods', () => {
        const config = { request: { method: 'get' } }
        expectNotToGetErrorsConcerning(config, 'request.method')
      })

      it.each(['LOL', 'WUT'].map((x) => [x]))('returns an error for unknown method "%s"', (method) => {
        const config = { request: { method } }
        expectValidationErors(
          config,
          `config[0].request.method must be one of [${Object.values(SupportedMethod).join(', ')}]`,
        )
      })

      it('returns an error if missing', () => {
        const config = { request: {} }
        expectValidationErors(config, 'config[0].request.method is required')
      })
    })

    describe('request.type', () => {
      it('returns an error when request.type is an empty string', () => {
        const config = { request: { type: '' } }
        expectValidationErors(config, 'config[0].request.type is not allowed to be empty')
      })
    })

    describe('request.headers', () => {
      it('is an object', () => {
        const config = { request: { headers: {} } }
        expectNotToGetErrorsConcerning(config, 'request.headers')
      })
    })

    const badEndpoints = ['https://example.com/api/yay', 'example.com/api/yay']
    describe('request.endpoints', () => {
      it('accepts a relative uri', () => {
        const config = { request: { endpoints: '/api/whatevs' } }
        expectNotToGetErrorsConcerning(config, 'request.endpoints')
      })

      it('accepts weird brace syntax for query strings', () => {
        const config = { request: { endpoints: '/api/whatevs?thingies[]=thing1&thingies[]=thing2' } }
        expectNotToGetErrorsConcerning(config, 'request.endpoints')
      })

      it.each(badEndpoints.map((x) => [x]))(
        'returns an error if the endpoint does not start with a / like in %s',
        (endpoint) => {
          const config = { request: { endpoints: endpoint } }
          expectValidationErors(config, 'config[0].request.endpoints must start with /')
        },
      )

      it('casts it to an array of strings if it is a single string', () => {
        const config = {
          name: 'hmm',
          request: { method: 'post', endpoints: '/hello' },
          response: { code: 200, body: 'ayy' },
        }
        const result = validateRawConfig([config])

        if (!result.success) {
          expect(result.errors).toStrictEqual([])
          expect(result.success).toBe(true)
          return
        }

        expect(result.success).toBe(true)
        expect(result.validatedConfigs[0].request.endpoints).toStrictEqual(['/hello'])
      })

      it('accepts a list of endpoints starting with /', () => {
        const config = { request: { endpoints: ['/ayy', '/lmao'] } }
        expectNotToGetErrorsConcerning(config, 'request.endpoints')
      })

      it('returns an error if any of the endpoints do not start with a /', () => {
        const config = {
          request: { endpoints: [badEndpoints[0], '/api/good-one', ''], 'hell bound': 123 },
        }
        expectValidationErors(config, 'config[0].request.endpoints[0] must start with /')
        expectValidationErors(config, 'config[0].request.endpoints[2] is not allowed to be empty')
      })
    })

    describe('request.serveEndpoint', () => {
      it('accepts a pattern url', () => {
        const config = { request: { serveEndpoint: '/books/:id/woah_there_buddy/*?hello=world' } }
        expectNotToGetErrorsConcerning(config, 'request.serveEndpoint')
      })

      it('must start with a /', () => {
        const config = { request: { serveEndpoint: badEndpoints[0] } }
        expectValidationErors(config, 'config[0].request.serveEndpoint must start with /')
      })
    })

    it('allows serveOnly', () => {
      const config = { serveOnly: true }
      expectNotToGetErrorsConcerning(config, 'serveOnly')
    })

    it('allows serveOnly not being set', () => {
      expectNotToGetErrorsConcerning({}, 'serveOnly')
    })

    it('allows request.endpoints and request.serveEndpoints to co-exist', () => {
      const config = { request: { endpoints: '/yo', serveEndpoint: '/dawg' } }
      expectNotToGetErrorsConcerning(config, 'request.endpoints', 'request.serveEndpoint')
    })

    it('returns an error if request.endpoints and request.serveEndpoint are both undefined', () => {
      const config = { serveOnly: true, request: { method: 'delete' } }
      expectValidationErors(
        config,
        'config[0].request must contain at least one of [endpoints, serveEndpoint]',
      )
    })

    describe('request.body', () => {
      it('can be a string', () => {
        const config = { request: { body: 'Hey dude!!!' } }
        expectNotToGetErrorsConcerning(config, 'request.body')
      })

      const objectCases = [`{ "hello": "world" }`, { hello: 'world' }]
      it.each(objectCases.map((x) => [x]))('can be an object like %o', (body) => {
        const config = { request: { body } }
        expectNotToGetErrorsConcerning(config, 'request.body')
      })

      it('is not required', () => {
        const config = { request: {} }
        expectNotToGetErrorsConcerning(config, 'request.body')
      })
    })

    describe('request.body and request.bodyPath', () => {
      it('does not require either to be specified', () => {
        const config = { request: {} }
        expectNotToGetErrorsConcerning(config, 'request.body', 'request.bodyPath')
      })

      it('returns an error if request.body and request.bodyPath are both specified', () => {
        const config = { request: { bodyPath: 'my file path', body: { my: 'body' } } }
        expectValidationErors(
          config,
          'config[0].request contains a conflict between optional exclusive peers [body, bodyPath]',
        )
      })
    })
  })

  describe('response', () => {
    it('returns an error if response is missing', () => {
      expectValidationErors({}, 'config[0].response is required')
    })

    it('returns an error if response is not an object', () => {
      const config = { response: 'ayy' }
      expectValidationErors(config, 'config[0].response must be of type object')
    })

    it('does not allow unknown fields', () => {
      const config = { response: { what: 'the' } }
      expectValidationErors(config, 'config[0].response.what is not allowed')
    })

    describe('response.code', () => {
      const goodCodes = [0, '200', 500]
      it.each(goodCodes.map((x) => [x]))('allows numbers', (code) => {
        const config = { response: { code } }
        expectNotToGetErrorsConcerning(config, 'response.code')
      })
    })

    describe('response.type', () => {
      it('is a string with no spaces', () => {
        const config = { response: { type: 'hello' } }
        expectNotToGetErrorsConcerning(config, 'response.type')
      })
    })

    describe('response.headers', () => {
      it('is an object', () => {
        const config = { response: { headers: { 'content-type': 'application/json' } } }
        expectNotToGetErrorsConcerning(config, 'response.headers')
      })
    })

    describe('response.body', () => {
      it('can be a string', () => {
        const config = { response: { body: 'Hey dude!!!' } }
        expectNotToGetErrorsConcerning(config, 'response.body')
      })

      const objectCases = [`{ "hello": "world" }`, { hello: 'world' }]
      it.each(objectCases.map((x) => [x]))('can be an object like %o', (body) => {
        const config = { response: { body } }
        expectNotToGetErrorsConcerning(config, 'response.body')
      })

      it('is not required', () => {
        const config = { response: {} }
        expectNotToGetErrorsConcerning(config, 'response.body')
      })
    })

    describe('response.serveBody', () => {
      it('can be a string', () => {
        const config = { response: { serveBody: 'Hey dude!!!' } }
        expectNotToGetErrorsConcerning(config, 'response.serveBody')
      })

      const objectCases = [`{ "hello": "world" }`, { hello: 'world' }]
      it.each(objectCases.map((x) => [x]))('can be an object like %o', (serveBody) => {
        const config = { response: { serveBody } }
        expectNotToGetErrorsConcerning(config, 'response.serveBody')
      })

      it('is not required', () => {
        const config = { response: {} }
        expectNotToGetErrorsConcerning(config, 'response.serveBody')
      })
    })

    describe('all response body types', () => {
      test('only one can be defined', () => {
        const config = {
          response: { body: 'ello', bodyPath: 'path1', serveBody: 'cya', serveBodyPath: 'path2' },
        }
        expectValidationErors(
          config,
          'config[0].response contains a conflict between optional exclusive peers [body, bodyPath, serveBody, serveBodyPath]',
        )
      })

      test('none are required', () => {
        const config = { response: {} }
        expectNotToGetErrorsConcerning(
          config,
          'response.body',
          'response.bodyPath',
          'response.serveBody',
          'response.serveBodyPath',
        )
      })
    })
  })

  describe('serveOnly', () => {
    it('is false by default if not supplied', () => {
      const config = {
        name: 'My Config',
        request: { method: 'get', endpoints: '/api' },
        response: { code: randomNumber() },
      }
      const validationResult = expectNotToGetErrorsConcerning(config, 'serveOnly')

      if (!validationResult.success) {
        expect(validationResult.errors).toStrictEqual([])
        expect(validationResult.success).toBe(true)
        return
      }

      expect(validationResult.success).toBe(true)
      expect(validationResult.validatedConfigs[0].serveOnly).toBe(false)
    })

    describe('when false', () => {
      it('returns an error if request.endpoints is not defined', () => {
        const config = { request: {} }
        expectValidationErors(config, 'config[0].request.endpoints is required')
      })

      it('allows request.endpoints and request.serveEndpoints to co-exist', () => {
        const config = { request: { endpoints: '/yo', serveEndpoint: '/dawg' } }
        expectNotToGetErrorsConcerning(config, 'request.endpoints', 'request.serveEndpoint')
      })
    })

    describe('when true', () => {
      it('returns an error if request.endpoints and request.serveEndpoint are both undefined', () => {
        const config = { serveOnly: true, request: { method: 'delete' } }
        expectValidationErors(
          config,
          'config[0].request must contain at least one of [endpoints, serveEndpoint]',
        )
      })
    })
  })

  describe('cases that should pass', () => {
    test('a pretty basic config', () => {
      const config = {
        name: 'Books',
        request: {
          method: 'GET',
          endpoints: ['/api/1', '/api/2'],
          serveEndpoint: '/api/*',
        },
        response: {
          code: 200,
          headers: {
            'content-type': 'application/json',
          },
          type: 'Book',
          serveBodyPath: './response/response.json',
        },
      }

      const result = validateRawConfig([config])

      if (!result.success) {
        expect(result.errors).toBeUndefined()
        expect(result.success).toBe(true)
        return
      }

      expect(result.success).toBe(true)
    })
  })
})

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
