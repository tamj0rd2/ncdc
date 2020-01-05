import { mockObj } from '../../test-helpers'
import { readGenerateConfig } from './config'
import _jsYaml from 'js-yaml'
import * as _io from '../../io'

jest.mock('js-yaml')
jest.mock('../../io')

describe('readGenerateConfig', () => {
  afterEach(() => jest.resetAllMocks())

  const { safeLoad } = mockObj(_jsYaml)
  const { readFileAsync } = mockObj(_io)

  it('calls readFileSync with the correct params', async () => {
    safeLoad.mockReturnValue([])

    await readGenerateConfig('./configPath')

    expect(readFileAsync).toHaveBeenCalledWith('./configPath')
  })

  it('calls safe load with the raw configuration', async () => {
    readFileAsync.mockResolvedValue('hello moto')
    safeLoad.mockReturnValue([])

    await readGenerateConfig('path')

    expect(safeLoad).toHaveBeenCalledWith('hello moto')
  })

  it('returns each mapped config', async () => {
    const loadedConfigs = [
      {
        name: 'Yo',
        request: { type: 'hey' },
        response: { type: 'bay' },
      },
    ]
    safeLoad.mockReturnValue(loadedConfigs)

    const result = await readGenerateConfig('path')

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      name: 'Yo',
      request: { type: 'hey' },
      response: { type: 'bay' },
    })
  })
})
