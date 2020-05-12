import { formatErrorDiagnostic, readTsConfig } from './ts-helpers'
import { mockObj, randomString } from '~test-helpers'
import ts from 'typescript'
import path from 'path'

jest.disableAutomock()
jest.mock('typescript')
jest.mock('path')

const mockedTs = mockObj(ts)
const mockedPath = mockObj(path)

beforeEach(() => {
  jest.resetAllMocks()
})

describe('format error diagnostic', () => {
  it('returns a formatted error', () => {
    const diagnostic = mockObj<ts.Diagnostic>({ code: 321, messageText: 'message' })
    mockedTs.flattenDiagnosticMessageText.mockReturnValue('formatted message')

    const result = formatErrorDiagnostic(diagnostic)

    expect(mockedTs.flattenDiagnosticMessageText).toBeCalledWith(diagnostic.messageText, ts.sys.newLine)
    expect(result).toEqual('Error 321: formatted message')
  })
})

describe('read ts config', () => {
  beforeEach(() => {
    mockedTs.readConfigFile.mockReturnValue({ config: {} })
    mockedTs.parseJsonConfigFileContent.mockReturnValue({ options: {}, errors: [], fileNames: [] })
  })

  const tsconfigPath = './tsconfig.json'
  it('it calls read config file with the correct args', () => {
    const fullTsPath = randomString() + 'tsconfig.json'
    mockedPath.resolve.mockReturnValue(fullTsPath)

    readTsConfig(tsconfigPath)

    expect(mockedPath.resolve).toBeCalledWith(tsconfigPath)
    expect(mockedTs.readConfigFile).toBeCalledWith(fullTsPath, mockedTs.sys.readFile)
  })

  it('throws if there is a config file error', () => {
    mockedTs.readConfigFile.mockReturnValue({ error: mockObj<ts.Diagnostic>({ code: 123 }) })

    expect(() => readTsConfig(tsconfigPath)).toThrowError('Error 123:')
  })

  it('throws if no config file is returned', () => {
    mockedTs.readConfigFile.mockReturnValue({})

    expect(() => readTsConfig(tsconfigPath)).toThrowError('Could not parse the given tsconfig file')
  })

  it('parses the json using the correct args', () => {
    const returnedConfig = mockObj<ts.ParsedCommandLine>({ options: {} })
    mockedTs.readConfigFile.mockReturnValue({ config: returnedConfig })
    const tsconfigFolderName = randomString('folder name')
    mockedPath.dirname.mockReturnValue(tsconfigFolderName)
    const fullTsconfigPath = randomString('full tsconfig path')
    mockedPath.resolve.mockReturnValue(fullTsconfigPath)

    readTsConfig(tsconfigPath)

    expect(mockedTs.parseJsonConfigFileContent).toBeCalledWith(
      returnedConfig,
      mockedTs.sys,
      tsconfigFolderName,
      {},
      fullTsconfigPath,
    )
  })

  it.each([
    [true, false],
    [false, true],
  ])('returns the correct config options when incremental is %s', (incremental, noEmit) => {
    mockedTs.readConfigFile.mockReturnValue({ config: {} })
    const configFile = mockObj<ts.ParsedCommandLine>({ options: { incremental }, fileNames: ['toad'] })
    mockedTs.parseJsonConfigFileContent.mockReturnValue(configFile)

    const result = readTsConfig(tsconfigPath)

    expect(result).toEqual({ fileNames: ['toad'], options: { ...configFile.options, noEmit } })
  })
})
