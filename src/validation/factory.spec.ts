import TypeValidatorFactory from './factory'
import { randomString, mockObj, mockFn, randomNumber } from '~test-helpers'
import { NcdcLogger } from '~logger'
import { ReportMetric } from '~commands/shared'
import TypeValidator from './type-validator'

jest.disableAutomock()
jest.mock('./type-validator')
jest.mock('~schema')

describe('TypeValidatorFactory', () => {
  const spyLogger = mockObj<NcdcLogger>({})
  const stubReportMetric = mockFn<ReportMetric>()

  afterEach(() => jest.resetAllMocks())

  describe('getValidator', () => {
    describe('when a schema path is provided', () => {
      const schemaPath = randomString('schema path')
      const factory = new TypeValidatorFactory(spyLogger, stubReportMetric)

      const getValidator = () =>
        factory.getValidator({
          schemaPath,
          tsconfigPath: randomString('tsconfig path'),
        })

      it('creates a new type validator each time it is called', async () => {
        const timesToCallGetValidator = randomNumber(1, 10)

        for (let i = 0; i < timesToCallGetValidator; i++) {
          await getValidator()
        }

        expect(TypeValidator).toBeCalledTimes(timesToCallGetValidator)
      })
    })

    describe('when a schema path is not provided', () => {
      const tsconfigPath = randomString('tsconfig')
      const factory = new TypeValidatorFactory(spyLogger, stubReportMetric)

      const getValidator = () => factory.getValidator({ tsconfigPath })

      it('creates a new type validator if one has not been cached yet', async () => {
        await getValidator()

        expect(TypeValidator).toBeCalledTimes(1)
      })

      it('does not create a new type validator if one has been cached already', async () => {
        await getValidator()

        expect(TypeValidator).toBeCalledTimes(0)
      })
    })
  })
})
