import { string, object, array } from 'yup'
import { safeLoad } from 'js-yaml'
import { readFileAsync } from '~io'

export type GenerateConfig = {
  name: string
  request: { type?: string }
  response: { type?: string }
}

export async function readGenerateConfig(configPath: string): Promise<GenerateConfig[]> {
  const generateSchema = array().of(
    object({
      name: string().required(),
      request: object({ type: string().notRequired() }).required(),
      response: object({ type: string().notRequired() }).required(),
    }),
  )
  const rawConfig = safeLoad(await readFileAsync(configPath))
  return await generateSchema.validate(rawConfig)
}

export type ReadGenerateConfig = typeof readGenerateConfig
