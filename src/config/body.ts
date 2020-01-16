import { readJsonAsync } from '~io'
import { resolve } from 'path'

interface BodyConfig {
  body?: Data
  bodyPath?: string
  serveBody?: Data
  serveBodyPath?: string
}

// TODO: rename this silly thing to GetResponseBody
export type GetBodyToUse = (config: BodyConfig) => Promise<Optional<Data>>

// TODO: this should be able to read other filetypes. not just JSON.
// TODO: this is broken. Absolute paths should not be found relatively
export const createGetBodyToUse = (configPath: string): GetBodyToUse => async config => {
  const { body, bodyPath, serveBody, serveBodyPath } = config

  if (body) return body
  if (bodyPath) return await readJsonAsync(resolve(configPath, '..', bodyPath))
  if (serveBody) return serveBody
  if (serveBodyPath) return await readJsonAsync(resolve(configPath, '..', serveBodyPath))
}
