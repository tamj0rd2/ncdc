import { safeLoad } from 'js-yaml'
import { readFileAsync } from '~io'
import Joi from '@hapi/joi'

export type GenerateConfig = {
  name: string
  request: { type?: string }
  response: { type?: string }
}

export async function readGenerateConfig(configPath: string): Promise<GenerateConfig[]> {
  const generateSchema = Joi.array()
    .required()
    .ruleset.unique('name')
    .message('must have a unique name')
    .ruleset.min(1)
    .message('Your config file must contain at least 1 config item')
    .items(
      Joi.object({
        name: Joi.string().required(),
        request: Joi.object({ type: Joi.string() }).required(),
        response: Joi.object({ type: Joi.string() }).required(),
      }),
    )

  const rawConfig = safeLoad(await readFileAsync(configPath))

  return await generateSchema.validateAsync(rawConfig)
}

export type ReadGenerateConfig = typeof readGenerateConfig
