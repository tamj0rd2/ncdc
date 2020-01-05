import * as yup from 'yup'
import { safeLoad } from 'js-yaml'
import { readFileAsync } from '../../io'

const generateSchema = yup.object({
  name: yup.string().required(),
  request: yup.object({ type: yup.string().notRequired() }).required(),
  response: yup.object({ type: yup.string().notRequired() }).required(),
})

type Config = yup.InferType<typeof generateSchema>
export type GenerateConfigs = Config[]

export async function readGenerateConfig(configPath: string): Promise<Config[]> {
  const generateSchema = yup.array().of(
    yup.object({
      name: yup.string().required(),
      request: yup.object({ type: yup.string().notRequired() }).required(),
      response: yup.object({ type: yup.string().notRequired() }).required(),
    }),
  )

  const rawConfig = safeLoad(await readFileAsync(configPath))
  return await generateSchema.validate(rawConfig)
}
