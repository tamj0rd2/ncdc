import Ajv from 'ajv'
import { TypeValidator } from '~validation'
import { mockObj, randomString } from '~test-helpers'
import { SchemaRetriever } from '~schema'
import { TypeValidationFailure } from './type-validator'
import strip from 'strip-ansi'

jest.unmock('ajv')
jest.mock('util', () => {
  return {
    inspect: jest.fn((data: unknown) => data),
  }
})

describe('error messages', () => {
  const ajv = new Ajv({ allErrors: true, verbose: true })
  const mockSchemaRetriever = mockObj<SchemaRetriever>({ load: jest.fn() })
  const typeValidator = new TypeValidator(ajv, mockSchemaRetriever)
  const type = randomString()

  test('missing required properties', async () => {
    mockSchemaRetriever.load.mockResolvedValue({
      type: 'object',
      properties: {
        allowed: { type: 'string' },
        proud: { type: 'number' },
      },
      required: ['allowed', 'proud'],
    })
    const data = { allowed: 'hello' }

    const result = (await typeValidator.validate(data, type)) as TypeValidationFailure

    expect(result.success).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(strip(result.errors[0])).toBe(`<root> should have required property 'proud'`)
  })

  test('wrong type', async () => {
    mockSchemaRetriever.load.mockResolvedValue({
      type: 'object',
      properties: {
        hello: { type: 'string' },
      },
      required: ['hello'],
    })
    const data = { hello: 123 }

    const result = (await typeValidator.validate(data, type)) as TypeValidationFailure

    expect(result.success).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(strip(result.errors[0])).toBe(`<root>.hello should be string but got number`)
  })

  test('enum', async () => {
    mockSchemaRetriever.load.mockResolvedValue({
      type: 'object',
      properties: {
        hello: { type: 'number', enum: [1, 5, 7] },
      },
      required: ['hello'],
    })
    const data = { hello: 123 }

    const result = (await typeValidator.validate(data, type)) as TypeValidationFailure

    expect(result.success).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(strip(result.errors[0])).toBe('<root>.hello should be equal to one of the allowed values: 1,5,7')
  })

  test('object enum', async () => {
    mockSchemaRetriever.load.mockResolvedValue({
      type: 'object',
      properties: {
        hello: { type: 'object', enum: [{ success: true }, { success: false, errors: ['error1'] }] },
      },
      required: ['hello'],
    })
    const data = { hello: { success: false } }

    const result = (await typeValidator.validate(data, type)) as TypeValidationFailure

    expect(result.success).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(strip(result.errors[0])).toContain('<root>.hello should be equal to one of the allowed values: ')
  })
})
