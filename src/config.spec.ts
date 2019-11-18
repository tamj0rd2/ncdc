import { createTestConfig, createMockConfig } from './config'

jest.mock('./io')

describe('createTestConfig', () => {
  it('throws for invalid test configs', () => {
    const config = [
      {
        name: 'A normal blah',
        request: {
          endpoint: '/api/blah',
          hey: 123,
          method: 'u wot',
        },
        response: {
          code: 200,
          type: 'DealSchema',
        },
        woah: {},
      },
    ]

    expect(() => createTestConfig(config as any)).toThrow()
  })

  it('succeeds for valid test configs', () => {
    const config = [
      {
        name: 'A normal blah',
        request: {
          endpoint: '/api/blah',
          method: 'u wot',
        },
        response: {
          code: 200,
          type: 'DealSchema',
        },
      },
    ]

    expect(() => createTestConfig(config as any)).toThrow()
  })
})

describe('createMockConfig', () => {
  it('throws for invalid test configs', () => {
    const config = [
      {
        name: 'A normal blah',
        request: {
          endpoint: '/api/blah',
          hey: 123,
          method: 'u wot',
        },
        response: {
          code: 200,
          type: 'DealSchema',
        },
        woah: {},
      },
    ]

    expect(() => createMockConfig(config as any)).toThrow()
  })

  it('succeeds for valid test configs', () => {
    const config = [
      {
        name: 'A normal blah',
        request: {
          endpoint: '/api/blah',
          mockEndpoint: '/api/blah/.*',
          method: 'u wot',
        },
        response: {
          code: 200,
          type: 'string',
          body: 'swish',
          mockBody: 'Yo',
        },
      },
    ]

    expect(() => createMockConfig(config as any)).toThrow()
  })
})
