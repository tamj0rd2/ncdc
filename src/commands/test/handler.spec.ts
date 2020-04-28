import { mockFn, randomString, mocked } from '~test-helpers'
import { HandleError, CreateTypeValidator } from '~commands/shared'
import { createHandler, TestArgs } from './handler'
import { resolve } from 'path'

jest.unmock('./handler')
jest.unmock('axios')
jest.mock('fs')
jest.mock('path')

const handleError = mockFn<HandleError>()
const createTypeValidator = mockFn<CreateTypeValidator>()
const handler = createHandler(handleError, createTypeValidator)

afterEach(() => jest.resetAllMocks())

it('returns an error if a configPath is not given', async () => {
  const args: TestArgs = { force: false, tsconfigPath: randomString() }

  await handler(args)

  expect(handleError).toBeCalledWith({ message: 'configPath must be specified' })
})

it('returns an error if a baseURL is not given', async () => {
  const args: TestArgs = { force: false, tsconfigPath: randomString(), configPath: randomString() }

  await handler(args)

  expect(handleError).toBeCalledWith({ message: 'baseURL must be specified' })
})

it('returns an error if the tsconfig path does not exist', async () => {
  const args: TestArgs = {
    force: false,
    tsconfigPath: randomString('tsconfig-path'),
    configPath: randomString(),
    baseURL: randomString(),
  }
  mocked(resolve).mockReturnValue(args.tsconfigPath)

  await handler(args)

  expect(handleError).toBeCalledWith({ message: `${args.tsconfigPath} does not exist` })
})
