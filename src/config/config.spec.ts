import readConfigOld, { MockConfig } from './config'
import jsYaml from 'js-yaml'
import { mockObj } from '../test-helpers'

jest.mock('fs')
jest.mock('js-yaml')

const mockedJsYaml = mockObj(jsYaml)

describe('Read config', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('throws for invalid test configs', () => {
    mockedJsYaml.safeLoad.mockReturnValue([
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
    ])

    expect(() => readConfigOld('path')).toThrow()
  })

  it('succeeds for valid test configs', () => {
    const config = [
      {
        name: 'A normal blah',
        request: {
          endpoint: '/api/blah',
          method: 'GET',
        },
        response: {
          code: 200,
          type: 'DealSchema',
        },
      },
    ]
    mockedJsYaml.safeLoad.mockReturnValue(config)

    const result = readConfigOld('path')

    expect(result).toEqual(config)
  })

  it('throws for invalid mock configs', () => {
    mockedJsYaml.safeLoad.mockReturnValue([
      {
        name: 'A normal blah',
        request: {
          endpoint: '/api/blah',
          hey: 123,
          method: 'POST',
        },
        response: {
          code: 200,
          type: 'DealSchema',
        },
        woah: {},
      },
    ])

    expect(() => readConfigOld<MockConfig>('path')).toThrow()
  })

  it('succeeds for valid mock configs', () => {
    const config = [
      {
        name: 'A normal blah',
        request: {
          endpoint: '/api/blah',
          mockEndpoint: '/api/blah/.*',
          method: 'GET',
        },
        response: {
          code: 200,
          type: 'string',
          body: 'swish',
          mockBody: 'Yo',
        },
      },
    ]

    mockedJsYaml.safeLoad.mockReturnValue(config)

    const result = readConfigOld<MockConfig>('path')

    expect(result).toEqual(config)
  })
})

describe('readTestConfig', () => {})
