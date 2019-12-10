import { ErrorObject } from 'ajv'
import Problem, { ProblemContext, ProblemType } from './problem'
import { Data } from './types'

describe('DetailedProblem', () => {
  it('can be constructed from an ErrorObject', () => {
    const errorObj: Partial<ErrorObject> = {
      dataPath: 'my.property',
      message: 'Hello',
      parentSchema: { $schema: 'my schema' },
      data: { woah: 'dude' },
    }

    const problem = new Problem(errorObj as ErrorObject, ProblemType.Response)

    expect(problem.path).toBe('<root>my.property')
    expect(problem.message).toBe('Hello')
    expect(problem.data).toStrictEqual({ woah: 'dude' })
    expect(problem.schema).toStrictEqual({ $schema: 'my schema' })
  })

  it('maps the path correctly when it is an empty string', () => {
    const errorObj: Partial<ErrorObject> = {
      dataPath: '',
    }

    const problem = new Problem(errorObj as ErrorObject, ProblemType.Request)

    expect(problem.path).toBe('<root>')
  })

  it('can be constructed from a custom context', () => {
    const context: ProblemContext = {
      message: 'Hello, world!',
      data: { woah: 'man' },
    }

    const problem = new Problem(context, ProblemType.Response)

    expect(problem.path).toBe('<root>')
    expect(problem.message).toBe('Hello, world!')
    expect(problem.data).toStrictEqual({ woah: 'man' })
    expect(problem.schema).toBeUndefined()
  })

  describe('data', () => {
    it('truncates strings within the data', () => {
      const longString = 'Hello. I guess this is around 50 characters, right? Yup!'
      const expectedString = 'Hello. I guess this is around 50 characters, right...'
      const errorObj: Partial<ErrorObject> = {
        dataPath: 'my.property',
        data: {
          woah: longString,
          nested: {
            woah: longString,
            array: [longString],
          },
        },
      }

      const problem = new Problem(errorObj as ErrorObject, ProblemType.Response)

      expect(problem.data).toStrictEqual({
        woah: expectedString,
        nested: { woah: expectedString, array: [expectedString] },
      })
    })

    it('truncates returned data without modifying the original', () => {
      const longString = 'Hello. I guess this is around 50 characters, right? Yup!'
      const errorObj: Partial<ErrorObject> = {
        dataPath: 'my.property',
        data: {
          woah: longString,
          num: 567,
          nested: {
            woah: longString,
            array: [longString, { blah: longString }, 123, false],
          },
          isAllGoodMan: true,
        },
      }

      new Problem(errorObj as ErrorObject, ProblemType.Request)

      expect(errorObj.data).toStrictEqual({
        woah: longString,
        num: 567,
        nested: {
          woah: longString,
          array: [longString, { blah: longString }, 123, false],
        },
        isAllGoodMan: true,
      })
    })

    const simpleDataCases: Data[] = [
      [
        'Hello. I guess this is around 50 characters, right? Yup!',
        'Hello. I guess this is around 50 characters, right...',
      ],
      ['Under 50!', 'Under 50!'],
      [
        2984729831349017481234129348123412341234274982734193,
        2984729831349017481234129348123412341234274982734193,
      ],
      [true, true],
    ]

    it.each(simpleDataCases)('it truncates "%s" appropriately', (original, expected) => {
      const errorObj: Partial<ErrorObject> = {
        dataPath: 'wow',
        data: original,
      }

      const problem = new Problem(errorObj as ErrorObject, ProblemType.Response)

      expect(problem.data).toStrictEqual(expected)
    })
  })
})
