import { validate, ValidationFailure, supportedMethods, ValidationSuccess } from './config'

jest.disableAutomock()

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
      const config = { name: 'hmm', request: { method: 'post', endpoints: '/hello' }, response: {} }
      const result = validate([config])

      if (!result.success) {
        expect(result.errors).toStrictEqual([])
        expect(result.success).toBe(true)
        return
      }

      expect(result.success).toBe(true)
      expect(result.validatedConfig[0].request.endpoints).toStrictEqual(['/hello'])
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
      const config = { name: 'My Config', request: { method: 'get', endpoints: '/api' }, response: {} }
      const validationResult = expectNotToGetErrorsConcerning(config, 'serveOnly')

      if (!validationResult.success) {
        expect(validationResult.errors).toStrictEqual([])
        expect(validationResult.success).toBe(true)
        return
      }

      expect(validationResult.success).toBe(true)
      expect(validationResult.validatedConfig[0].serveOnly).toBe(false)
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
