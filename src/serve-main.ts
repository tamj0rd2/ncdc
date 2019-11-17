import NConfig from './config'
import { tryParseJson } from './io'

export const serveMocks = async (
  configPath: string,
  port: number,
  allErrors: boolean,
  tsconfigPath: string,
): Promise<void> => {
  const config = new NConfig(await tryParseJson(configPath as string))
  console.dir(config, { depth: undefined })
  console.log('port', port)
  console.log('TODO: Implement serving mock API responses')
}
