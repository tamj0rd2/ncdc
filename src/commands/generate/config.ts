import * as yup from 'yup'
import { safeLoad } from 'js-yaml'
import { readFileAsync } from '../../io'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function readGenerateConfig(configPath: string) {
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
