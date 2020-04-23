import {
  validate,
  ValidationFailure,
  supportedMethods,
  ValidationSuccess,
  transformConfigs,
  ValidatedServeConfig,
} from './config'
import { Config } from '~config'
import { randomString, mocked } from '~test-helpers'
import { isAbsolute, resolve } from 'path'
import { readJsonAsync } from '~io'
import dot from 'dot-object'

jest.unmock('./config')
jest.unmock('@hapi/joi')
jest.unmock('dot-object')
jest.mock('path')

describe('validate', () => {
  const expectValidationErors = (config?: object, ...expectedErrors: string[]): string[] => {
    const { success, errors } = validate([config]) as ValidationFailure
    expect(success).toBe(false)
    for (const expectedError of expectedErrors) {
      expect(errors).toContain(expectedError)
    }
    return errors
  }

  const expectNotToGetErrorsConcerning = (
    config?: object,
    ...unexpectedStrings: string[]
  ): ValidationSuccess | ValidationFailure => {
    const validationResult = validate([config])
    if (validationResult.success) return validationResult

    const allErrors = validationResult.errors.join('\n')
    for (const unexpectedString of unexpectedStrings) {
      expect(allErrors).not.toContain(unexpectedString)
    }

    return validationResult
  }

  it('returns an error when the config file is an empty array', () => {
    const { success, errors } = validate([]) as ValidationFailure

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
    expectValidationErors(config, "'Yo fam'.fake is not allowed")
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
      it.each(supportedMethods.map((x) => [x]))('allows method %s', (method) => {
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
          `config[0].request.method must be one of [${supportedMethods.join(', ')}]`,
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
        const result = validate([config])

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

    describe('serveOnly', () => {
      it('is false by default if not supplied', () => {
        const config = {
          name: 'My Config',
          request: { method: 'get', endpoints: '/api' },
          response: { code: 200, bodyPath: 'lol' },
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

      const result = validate([config])

      if (!result.success) {
        expect(result.errors).toBeUndefined()
        expect(result.success).toBe(true)
        return
      }

      expect(result.success).toBe(true)
    })
  })
})

describe('transform configs', () => {
  const mockReadJsonAsync = mocked(readJsonAsync)

  const createBasicConfig = (): ValidatedServeConfig => {
    return {
      name: randomString(),
      serveOnly: false,
      request: {
        method: 'GET',
        endpoints: ['hola!'],
        headers: {},
        type: 'SomeType',
      },
      response: {
        code: 200,
        headers: { 'content-type': 'woah' },
        type: 'ResponseType',
      },
    }
  }

  it('returns the correct result for the most basic config', async () => {
    const config = createBasicConfig()
    config.request.endpoints = ['/api/1']

    const result = await transformConfigs([config], '')

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject<Config>({
      name: config.name,
      request: {
        endpoint: config.request.endpoints![0],
        method: config.request.method,
        headers: config.request.headers,
        type: config.request.type,
      },
      response: {
        code: config.response.code,
        headers: config.response.headers,
        type: config.response.type,
      },
    })
  })

  it('returns multiple configs if there are multiple request endpoints', async () => {
    const config = createBasicConfig()
    config.request.endpoints = ['/api/1', '/api/2']

    const result = await transformConfigs([config], '')

    expect(result).toHaveLength(2)
    expect(result[0].request.endpoint).toBe(config.request.endpoints![0])
    expect(result[1].request.endpoint).toBe(config.request.endpoints![1])
  })

  const bodyCases = ['request.body', 'response.body']
  it.each(bodyCases.map((x) => [x]))('sets the %s', async (key) => {
    const config = createBasicConfig()
    dot.set(key, randomString(), config)

    const result = await transformConfigs([config], '')

    expect(result).toHaveLength(1)
    const body = dot.pick(key, result[0])
    expect(body).toBeDefined()
    expect(body).toBe(dot.pick(key, config))
  })

  // const bodyPathCases = ['request.bodyPath', 'response.bodyPath', 'response.serveBodyPath']
  const bodyPathCases = [
    ['request.bodyPath', 'request.body'],
    ['response.bodyPath', 'response.body'],
    ['response.serveBodyPath', 'response.body'],
  ]
  describe.each(bodyPathCases.map((x) => [x]))('when %s is present', ([bodyPath, destination]) => {
    const mockIsAbsolute = mocked(isAbsolute)
    mockReadJsonAsync.mockResolvedValue({ nice: 'one' })

    it(`sets ${bodyPath} when the path is absolute`, async () => {
      mockIsAbsolute.mockReturnValue(true)
      const config = createBasicConfig()
      const pathToSet = randomString()
      dot.set(bodyPath, pathToSet, config)

      const result = await transformConfigs([config], '')

      expect(mockIsAbsolute).toBeCalledWith(pathToSet)
      expect(mockReadJsonAsync).toBeCalledWith(pathToSet)
      expect(result).toHaveLength(1)
      expect(dot.pick(destination, result[0])).toStrictEqual({ nice: 'one' })
    })

    it(`sets ${bodyPath} when the path is relative`, async () => {
      mockIsAbsolute.mockReturnValue(false)
      const mockResolve = mocked(resolve)
      mockResolve.mockReturnValue('absolute path')

      const config = createBasicConfig()
      const pathToSet = randomString()
      dot.set(bodyPath, pathToSet, config)
      const absoluteConfigPath = randomString()

      const result = await transformConfigs([config], absoluteConfigPath)

      expect(mockIsAbsolute).toBeCalledWith(pathToSet)
      expect(mockResolve).toBeCalledWith(absoluteConfigPath, '..', pathToSet)
      expect(mockReadJsonAsync).toBeCalledWith('absolute path')
      expect(dot.pick(destination, result[0])).toStrictEqual({ nice: 'one' })
    })
  })
})
