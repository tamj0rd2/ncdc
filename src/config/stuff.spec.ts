import { object, bool, array, string } from 'yup'
import { Mode } from './types'
import { testResponseSchema } from './response'
import { getTestSchema } from './request/test-schema'
import { getServeSchema } from './request/serve-schema'

jest.disableAutomock()

it('throws an error for missing endpoints when serveOnly is false', async () => {
  const schema = array().of(
    object({
      name: string().required(),
      serveOnly: bool().default(false),
      request: object()
        .when('serveOnly', {
          is: false,
          then: getTestSchema(false),
          otherwise: getTestSchema(true),
        })
        .required(),
      response: testResponseSchema.required(),
    }),
  )

  const rawConfigs = [
    {
      name: '1',
      serveOnly: false,
      request: {
        method: 'GET',
      },
      response: {
        code: 200,
      },
    },
  ]

  await expect(schema.validate(rawConfigs)).rejects.toThrowError('endpoints')
})

it('throws an error for missing endpoints when serveOnly is false', async () => {
  const mode = Mode.Test
  const serveSchema = getServeSchema()
  const testSchema = getTestSchema()
  const testSchemaServeOnly = getTestSchema(true)
  const schema = array().of(
    object({
      name: string().required(),
      serveOnly: bool().default(false),
      request: object()
        .when('serveOnly', {
          is: false,
          then: mode === Mode.Test ? testSchema : serveSchema,
          otherwise: mode === Mode.Test ? testSchemaServeOnly : serveSchema,
        })
        .required(),
      response: testResponseSchema.required(),
    }),
  )

  const rawConfigs = [
    {
      name: '1',
      serveOnly: true,
      request: {
        method: 'GET',
      },
      response: {
        code: 200,
      },
    },
  ]

  await expect(schema.validate(rawConfigs)).resolves.not.toThrowError()
})
