import { readYamlAsync } from '~io'
import { validateRawConfig } from '~config/validate'
import { red } from 'chalk'

export type GenerateConfig = {
  name: string
  request: { type?: string }
  response: { type?: string }
}

export async function readGenerateConfig(configPath: string): Promise<GenerateConfig[]> {
  const rawConfig = await readYamlAsync(configPath)

  const validationResult = validateRawConfig<GenerateConfig>(rawConfig)
  if (!validationResult.success) {
    throw new Error(`${red.bold('Invalid config file')}:\n${validationResult.errors.join('\n')}`)
  }

  return validationResult.validatedConfigs
}

export type ReadGenerateConfig = typeof readGenerateConfig
