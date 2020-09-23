import { validateRawConfig } from './validate'
import strip from 'strip-ansi'
import { SupportedMethod } from './resource'
import { randomNumber, randomString } from '~test-helpers'
import '../jest-extensions'
import { RawConfigBuilder } from './raw-config-builder'

jest.disableAutomock()

describe('validate', () => {
  function createTestDeps() {
    const filePath = randomString('filePath')
    return {
      filePath: filePath,
      constructExpectedError: (...messages: string[]) =>
        [`Invalid service config file (${filePath}):`, ...messages].join('\n'),
      nonRelativeEndpoint: randomString('https://example.com/api/resource'),
      endpointMissingSlash: randomString('api/resource'),
      relativeEndpoint: randomString('/api/resource'),
    }
  }

  const expectValidationErors = (config?: object | object[], ...expectedErrors: string[]): void => {
    const { filePath, constructExpectedError } = createTestDeps()

    const validate = () => validateRawConfig(Array.isArray(config) ? config : [config], filePath)

    const expectedError = constructExpectedError(...expectedErrors)
    expect(validate).toThrowColouredError(expectedError)
  }

  const expectNotToGetErrorsConcerning = (
    config?: object | object[],
    ...unexpectedStrings: string[]
  ): void => {
    try {
      validateRawConfig(Array.isArray(config) ? config : [config], randomString('filePath'))
    } catch (err) {
      const errorMessage = strip(err.message)
      unexpectedStrings.forEach((unexpectedString) => expect(errorMessage).not.toContain(unexpectedString))
    }
  }

  // TODO: these cases need fleshing out
  describe('It validates/casts some basic cases', () => {
    test.todo('most slimlined raw config')

    test('fullest raw config', () => {
      const { filePath } = createTestDeps()
      const rawConfig = new RawConfigBuilder().withRequestHeaders({ accept: 'application/json' }).build()

      expect(() => validateRawConfig([rawConfig], filePath)).not.toThrow()
    })
  })

  describe('basic validation', () => {
    it('throws an error when the config file is an empty array', () => {
      const { filePath, constructExpectedError } = createTestDeps()
      const configFileContent: unknown[] = []

      const validate = () => validateRawConfig(configFileContent, filePath)

      const expectedError = constructExpectedError('Your config file must contain at least 1 config item')
      expect(validate).toThrowColouredError(expectedError)
    })

    it('throws an error when the config file has an empty config item', () => {
      const { filePath, constructExpectedError } = createTestDeps()
      const configFileContent = [undefined]

      const validate = () => validateRawConfig(configFileContent, filePath)

      const expectedError = constructExpectedError('config[0] must not be a sparse array item')
      expect(validate).toThrowColouredError(expectedError)
    })

    it('throws an error if config name is missing', () => {
      const { filePath, constructExpectedError } = createTestDeps()
      const configFileContent = [new RawConfigBuilder().withName(undefined).build()]

      const validate = () => validateRawConfig(configFileContent, filePath)

      const expectedError = constructExpectedError('config[0].name is required')
      expect(validate).toThrowColouredError(expectedError)
    })

    it('throws an error if there are unrecognised keys', () => {
      const { filePath, constructExpectedError } = createTestDeps()
      const badKey = randomString('randomKey')
      const rawConfig = { ...RawConfigBuilder.random(), [badKey]: randomString('randomValue') }

      const validate = () => validateRawConfig([rawConfig], filePath)

      const expectedError = constructExpectedError(`config[${rawConfig.name}].${badKey} is not allowed`)
      expect(validate).toThrowColouredError(expectedError)
    })

    it('throws an error if any configs have the same name', () => {
      const { filePath, constructExpectedError } = createTestDeps()
      const config1 = RawConfigBuilder.random()
      const config2 = new RawConfigBuilder().withName(config1.name).build()

      const validate = () => validateRawConfig([config1, config2], filePath)

      // TODO: this error can probably be improved
      const expectedError = constructExpectedError(`config[${config1.name}] must have a unique name`)
      expect(validate).toThrowColouredError(expectedError)
    })

    it('allows configs with different names', () => {
      const { filePath } = createTestDeps()
      const config1 = RawConfigBuilder.random()
      const config2 = RawConfigBuilder.random()

      const validate = () => validateRawConfig([config1, config2], filePath)

      expect(validate).not.toThrow()
    })
  })

  describe('request', () => {
    it('throws an error if request is missing', () => {
      const { filePath, constructExpectedError } = createTestDeps()
      const rawConfig = new RawConfigBuilder().withRequest(undefined).build()

      const validate = () => validateRawConfig([rawConfig], filePath)

      const expectedError = constructExpectedError(`config[${rawConfig.name}].request is required`)
      expect(validate).toThrowColouredError(expectedError)
    })

    it('throws an error if request is not an object', () => {
      const { filePath, constructExpectedError } = createTestDeps()
      const rawConfig = new RawConfigBuilder()
        .withRequest(
          // @ts-expect-error
          'not an object',
        )
        .build()

      const validate = () => validateRawConfig([rawConfig], filePath)

      const expectedError = constructExpectedError(`config[${rawConfig.name}].request must be of type object`)
      expect(validate).toThrowColouredError(expectedError)
    })

    it('does not allow unknown fields', () => {
      const { filePath, constructExpectedError } = createTestDeps()
      const badKey = randomString('badKey')
      const rawConfig = new RawConfigBuilder()
        .withRequest({
          endpoints: randomString('/endpoint'),
          method: 'get',
          [badKey]: randomString('randomValue'),
        })
        .build()

      const validate = () => validateRawConfig([rawConfig], filePath)

      const expectedError = constructExpectedError(
        `config[${rawConfig.name}].request.${badKey} is not allowed`,
      )
      expect(validate).toThrowColouredError(expectedError)
    })

    describe('request.method', () => {
      it.each(Object.values(SupportedMethod).map((x) => [x]))('allows method %s', (method) => {
        const { filePath } = createTestDeps()
        const rawConfig = new RawConfigBuilder().withRequestMethod(method).build()

        const validate = () => validateRawConfig([rawConfig], filePath)

        expect(validate).not.toThrow()
      })

      it('allows lower case versions of the methods', () => {
        const { filePath } = createTestDeps()
        const rawConfig = new RawConfigBuilder().withRequestMethod('get').build()

        const validate = () => validateRawConfig([rawConfig], filePath)

        expect(validate).not.toThrow()
      })

      it.each(['LOL', 'WUT'].map((x) => [x]))('throws an error for unknown method "%s"', (method) => {
        const rawConfig = new RawConfigBuilder().withRequestMethod(method).build()

        expectValidationErors(
          rawConfig,
          `config[${rawConfig.name}].request.method must be one of [${Object.values(SupportedMethod).join(
            ', ',
          )}]`,
        )
      })

      it('throws an error if missing', () => {
        const rawConfig = new RawConfigBuilder().withRequestMethod(undefined).build()

        expectValidationErors(rawConfig, `config[${rawConfig.name}].request.method is required`)
      })
    })

    describe('request.type', () => {
      it('throws an error when request.type is an empty string', () => {
        const rawConfig = new RawConfigBuilder().withRequestType('').build()

        expectValidationErors(rawConfig, `config[${rawConfig.name}].request.type is not allowed to be empty`)
      })
    })

    describe('request.headers', () => {
      it('is an object', () => {
        const rawConfig = new RawConfigBuilder().withRequestHeaders({ accept: 'application/json' }).build()

        expectNotToGetErrorsConcerning(rawConfig, 'request.headers')
      })
    })

    describe('request.endpoints', () => {
      it('accepts a relative uri', () => {
        const config = { request: { endpoints: '/api/whatevs' } }
        expectNotToGetErrorsConcerning(config, 'request.endpoints')
      })

      it('accepts weird brace syntax for query strings', () => {
        const config = { request: { endpoints: '/api/whatevs?thingies[]=thing1&thingies[]=thing2' } }
        expectNotToGetErrorsConcerning(config, 'request.endpoints')
      })

      it('throws an error if an endpoint does not start with /', () => {
        const { endpointMissingSlash } = createTestDeps()
        const rawConfig = new RawConfigBuilder().withRequestEndpoints(endpointMissingSlash).build()

        expectValidationErors(rawConfig, `config[${rawConfig.name}].request.endpoints must start with /`)
      })

      it('throws an error if the endpoint is not relative', () => {
        const { nonRelativeEndpoint } = createTestDeps()
        const rawConfig = new RawConfigBuilder().withRequestEndpoints(nonRelativeEndpoint).build()

        expectValidationErors(
          rawConfig,
          `config[${rawConfig.name}].request.endpoints should be a relative uri`,
          `config[${rawConfig.name}].request.endpoints must start with /`,
        )
      })

      it('casts it to an array of strings if it is a single string', () => {
        const { filePath } = createTestDeps()
        const config = {
          name: 'hmm',
          request: { method: 'post', endpoints: '/hello' },
          response: { code: 200, body: 'ayy' },
        }
        const result = validateRawConfig([config], filePath)

        expect(result[0].request.endpoints).toStrictEqual(['/hello'])
      })

      it('accepts a list of endpoints starting with /', () => {
        const config = { request: { endpoints: ['/ayy', '/lmao'] } }
        expectNotToGetErrorsConcerning(config, 'request.endpoints')
      })

      it('throws an error if any of the endpoints do not start with a /', () => {
        const { nonRelativeEndpoint, relativeEndpoint } = createTestDeps()
        const rawConfig = new RawConfigBuilder()
          .withRequestEndpoints([nonRelativeEndpoint, relativeEndpoint, ''])
          .build()

        expectValidationErors(
          rawConfig,
          `config[${rawConfig.name}].request.endpoints[0] should be a relative uri`,
          `config[${rawConfig.name}].request.endpoints[0] must start with /`,
          `config[${rawConfig.name}].request.endpoints[2] is not allowed to be empty`,
        )
      })
    })

    describe('request.serveEndpoint', () => {
      it('accepts a pattern url', () => {
        const config = { request: { serveEndpoint: '/books/:id/woah_there_buddy/*?hello=world' } }
        expectNotToGetErrorsConcerning(config, 'request.serveEndpoint')
      })

      it('must start with a /', () => {
        const { nonRelativeEndpoint } = createTestDeps()
        const rawConfig = new RawConfigBuilder().withRequestServeEndpoint(nonRelativeEndpoint).build()

        expectValidationErors(
          rawConfig,
          `config[${rawConfig.name}].request.serveEndpoint should be a relative uri`,
          `config[${rawConfig.name}].request.serveEndpoint must start with /`,
        )
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

    it('throws an error if request.endpoints and request.serveEndpoint are both undefined', () => {
      const rawConfig = new RawConfigBuilder()
        // TODO: I don't understand why serveOnly is true here
        .withServeOnly(true)
        .withRequestEndpoints(undefined)
        .withRequestServeEndpoint(undefined)
        .build()

      expectValidationErors(
        rawConfig,
        `config[${rawConfig.name}].request must contain at least one of [endpoints, serveEndpoint]`,
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

      it('throws an error if request.body and request.bodyPath are both specified', () => {
        const rawConfig = new RawConfigBuilder()
          .withRequestBody(randomString('body'))
          .withRequestBodyPath(randomString('bodyPath'))
          .build()

        expectValidationErors(
          rawConfig,
          `config[${rawConfig.name}].request contains a conflict between optional exclusive peers [body, bodyPath]`,
        )
      })
    })
  })

  describe('response', () => {
    it('throws an error if response is missing', () => {
      const rawConfig = new RawConfigBuilder().withResponse(undefined).build()

      expectValidationErors(rawConfig, `config[${rawConfig.name}].response is required`)
    })

    it('throws an error if response is not an object', () => {
      const rawConfig = new RawConfigBuilder()
        .withResponse(
          // @ts-expect-error
          'not an object',
        )
        .build()

      expectValidationErors(rawConfig, `config[${rawConfig.name}].response must be of type object`)
    })

    it('does not allow unknown fields', () => {
      const rawConfig = new RawConfigBuilder().withResponse({ code: randomNumber(), what: 'the' }).build()

      expectValidationErors(rawConfig, `config[${rawConfig.name}].response.what is not allowed`)
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

    describe('all response body properties', () => {
      test('only one can be defined at a time', () => {
        const rawConfig = new RawConfigBuilder()
          .withResponseBody(randomString('body'))
          .withResponseBodyPath(randomString('bodyPath'))
          .withResponseServeBody(randomString('serveBody'))
          .withResponseServeBodyPath(randomString('serveBodyPath'))
          .build()

        expectValidationErors(
          rawConfig,
          `config[${rawConfig.name}].response contains a conflict between optional exclusive peers [body, bodyPath, serveBody, serveBodyPath]`,
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
      const { filePath } = createTestDeps()
      const rawConfig = new RawConfigBuilder().withServeOnly(undefined).build()

      const result = validateRawConfig([rawConfig], filePath)

      expect(result[0].serveOnly).toBe(false)
    })

    describe('when false', () => {
      it('throws an error if request.endpoints is not defined', () => {
        const rawConfig = new RawConfigBuilder().withServeOnly(false).withRequestEndpoints(undefined).build()

        expectValidationErors(rawConfig, `config[${rawConfig.name}].request.endpoints is required`)
      })

      it('allows request.endpoints and request.serveEndpoints to co-exist', () => {
        const config = { request: { endpoints: '/yo', serveEndpoint: '/dawg' } }
        expectNotToGetErrorsConcerning(config, 'request.endpoints', 'request.serveEndpoint')
      })
    })

    describe('when true', () => {
      it('throws an error if request.endpoints and request.serveEndpoint are both undefined', () => {
        const rawConfig = new RawConfigBuilder()
          .withServeOnly(true)
          .withRequestEndpoints(undefined)
          .withRequestServeEndpoint(undefined)
          .build()

        expectValidationErors(
          rawConfig,
          `config[${rawConfig.name}].request must contain at least one of [endpoints, serveEndpoint]`,
        )
      })
    })
  })

  describe('cases that should pass', () => {
    test('a pretty basic config', () => {
      const { filePath } = createTestDeps()
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

      expect(() => validateRawConfig([config], filePath)).not.toThrow()
    })
  })
})
