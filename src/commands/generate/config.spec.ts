import { mockFn } from '~test-helpers'
import { readGenerateConfig } from './config'
import { safeLoad } from 'js-yaml'
import { readFileAsync } from '~io'

jest.unmock('./config')

describe('readGenerateConfig', () => {
  afterEach(() => jest.resetAllMocks())

  it('calls readFileSync with the correct params', async () => {
    mockFn(safeLoad).mockReturnValue([])

    await readGenerateConfig('./configPath')

    expect(mockFn(readFileAsync)).toHaveBeenCalledWith('./configPath')
  })

  it('calls safe load with the raw configuration', async () => {
    mockFn(readFileAsync).mockResolvedValue('hello moto')
    mockFn(safeLoad).mockReturnValue([])

    await readGenerateConfig('path')

    expect(mockFn(safeLoad)).toHaveBeenCalledWith('hello moto')
  })

  it('returns each mapped config', async () => {
    const loadedConfigs = [
      {
        name: 'Yo',
        request: { type: 'hey' },
        response: { type: 'bay' },
      },
    ]
    mockFn(safeLoad).mockReturnValue(loadedConfigs)

    const result = await readGenerateConfig('path')

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      name: 'Yo',
      request: { type: 'hey' },
      response: { type: 'bay' },
    })
  })
})
