import { mocked, randomString } from '~test-helpers'
import { readJsonAsync } from '~io'
import { ValidatedTestConfig, transformConfigs, TestConfig } from './config'
import { isAbsolute, resolve } from 'path'
import dot from 'dot-object'

jest.mock('path')
jest.unmock('./config')

describe('transform configs', () => {
  const mockReadJsonAsync = mocked(readJsonAsync)

  const createBasicConfig = (): ValidatedTestConfig => {
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
    expect(result[0]).toMatchObject<TestConfig>({
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

  const bodyPathCases = [
    ['request.bodyPath', 'request.body'],
    ['response.bodyPath', 'response.body'],
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
