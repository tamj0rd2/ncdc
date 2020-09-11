import TypeValidatorFactory from './factory'
import { randomString, mockObj, mockFn, randomNumber } from '~test-helpers'
import { NcdcLogger } from '~logger'
import { ReportMetric } from '~commands/shared'
import TypeValidator from './type-validator'

jest.disableAutomock()
jest.mock('./type-validator')
jest.mock('~schema')

describe('TypeValidatorFactory', () => {
  function createTestDeps() {
    const spyLogger = mockObj<NcdcLogger>({})
    const dummyReportMetric: ReportMetric = mockFn<ReportMetric>().mockReturnValue({
      fail: jest.fn(),
      subMetric: jest.fn(),
      success: jest.fn(),
    })
    return {
      spyLogger,
      dummyReportMetric,
      factory: new TypeValidatorFactory(spyLogger, dummyReportMetric),
    }
  }

  afterEach(() => jest.resetAllMocks())

  describe('getValidator', () => {
    describe('when a schema path is provided', () => {
      it('creates a new type validator each time it is called', async () => {
        const { factory } = createTestDeps()
        const schemaPath = randomString('schema path')
        const timesToCallGetValidator = randomNumber(1, 10)

        for (let i = 0; i < timesToCallGetValidator; i++) {
          await factory.getValidator({
            schemaPath,
            tsconfigPath: randomString('tsconfig path'),
          })
        }

        expect(TypeValidator).toBeCalledTimes(timesToCallGetValidator)
      })
    })

    describe('when a schema path is not provided', () => {
      it('creates a new type validator if one has not been cached yet', async () => {
        const { factory } = createTestDeps()
        const tsconfigPath = randomString('tsconfig')

        await factory.getValidator({ tsconfigPath })

        expect(TypeValidator).toBeCalledTimes(1)
      })

      it('does not create a new type validator on subsequent calls', async () => {
        const { factory } = createTestDeps()
        const tsconfigPath = randomString('tsconfig')
        const timesToCallGetValidator = randomNumber(2, 10)

        for (let i = 0; i < timesToCallGetValidator; i++) {
          await factory.getValidator({ tsconfigPath })
        }

        expect(TypeValidator).toBeCalledTimes(1)
      })
    })
  })
})
