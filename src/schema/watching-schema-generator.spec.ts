import { WatchingSchemaGenerator } from './watching-schema-generator'
import { randomString, mockObj } from '~test-helpers'
import ts from 'typescript'
import * as tsHelpers from './ts-helpers'

jest.disableAutomock()
jest.mock('typescript-json-schema')
jest.mock('typescript')
jest.mock('./ts-helpers')

describe('load', () => {
  const mockTypescript = mockObj(ts)
  const mockTsHelpers = mockObj(tsHelpers)

  beforeEach(() => {
    jest.resetAllMocks()
    mockTypescript.readConfigFile.mockReturnValue({ config: {} })
    mockTypescript.createWatchCompilerHost.mockReturnValue(
      {} as ts.WatchCompilerHostOfFilesAndCompilerOptions<ts.BuilderProgram>,
    )
    mockTsHelpers.readTsConfig.mockReturnValue(
      mockObj<ts.ParsedCommandLine>({ options: {} }),
    )
  })

  it('throws an error if watching has not started yet', () => {
    const generator = new WatchingSchemaGenerator(randomString('tsconfig path'))

    expect(() => generator.load(randomString('my type'))).toThrowError('Watching has not started yet')
  })

  it('throws an error if reading the config file gives an error', () => {
    const expectedError = new Error(randomString('sad times'))
    mockTsHelpers.readTsConfig.mockImplementation(() => {
      throw expectedError
    })

    const generator = new WatchingSchemaGenerator(randomString('tsconfig path'))

    expect(() => generator.init()).toThrow(expectedError)
  })

  it('does not try to read the config file again if it is already initialised', () => {
    const generator = new WatchingSchemaGenerator(randomString('tsconfig path'))

    generator.init()
    generator.init()
    generator.init()
    generator.init()

    expect(mockTsHelpers.readTsConfig).toBeCalledTimes(1)
  })
})
