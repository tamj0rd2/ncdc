import { TypeValidator } from '~validation'
import { red, green, blue } from 'chalk'
import { TestConfig } from './config'
import { inspect } from 'util'
import { isDeeplyEqual } from '~util'
import { NcdcLogger } from '~logger'
import { ReportMetric } from '~commands/shared'

export type LoaderResponse = { status: number; data?: Data }
export type FetchResource = (config: TestConfig) => Promise<LoaderResponse>
export type GetTypeValidator = () => TypeValidator

export const runTests = async (
  baseUrl: string,
  fetchResource: FetchResource,
  configs: TestConfig[],
  getTypeValidator: GetTypeValidator,
  logger: NcdcLogger,
  reportMetric: ReportMetric,
): Promise<'Success' | 'Failure'> => {
  const testTasks2 = configs.map(
    async (config): Promise<{ success: boolean; message: string }> => {
      const failedLine = red.bold(`FAILED: ${config.name}`)
      const endpointSegment = `- ${blue(baseUrl + config.request.endpoint)}`

      const fetchMetric = reportMetric(`fetching ${config.request.endpoint} for config ${config.name}`)
      let res: LoaderResponse
      try {
        res = await fetchResource(config)
        fetchMetric.success()
      } catch (err) {
        fetchMetric.fail()
        return { success: false, message: `${failedLine} ${endpointSegment}\n${err.message}` }
      }

      if (res.status !== config.response.code) {
        const message = `Expected status code ${green(config.response.code)} but got ${red(res.status)}`
        return { success: false, message: `${failedLine} ${endpointSegment}\n${message}` }
      }

      const messages: string[] = []

      if (config.response.body) {
        if (res.data === undefined) {
          messages.push('No response body was received')
        } else if (!isDeeplyEqual(config.response.body, res.data)) {
          const message = `The response body was not deeply equal to your configured fixture`
          const formattedResponse = inspect(res.data, false, 4, true)
          messages.push(`${message}\nReceived:\n${formattedResponse}`)
        }
      }

      if (config.response.type) {
        const validationResult = await getTypeValidator().validate(res.data, config.response.type)
        if (!validationResult.success) {
          const message = `The received body does not match the type ${config.response.type}`
          messages.push(`${message}\n${validationResult.errors.join('\n')}`)
        }
      }

      if (messages.length) {
        return { success: false, message: `${failedLine} ${endpointSegment}\n${messages.join('\n')}` }
      }

      return { success: true, message: `${green('PASSED')}: ${config.name} ${endpointSegment}` }
    },
  )

  for (const testTask of testTasks2) {
    testTask.then(({ message, success }) => {
      if (success) logger.info(message)
      else logger.error(message)
    })
  }

  const allResults = await Promise.all(testTasks2)
  return allResults.find((r) => !r.success) ? 'Failure' : 'Success'
}
