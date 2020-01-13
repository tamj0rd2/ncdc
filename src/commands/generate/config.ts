import { string, object, array } from 'yup'
import { safeLoad } from 'js-yaml'
import { readFileAsync } from '~io'

type Config = {
  name: string
  request: { type?: string }
  response: { type?: string }
}

export type GenerateConfigs = Config[]

export async function readGenerateConfig(configPath: string): Promise<GenerateConfigs> {
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
