import { ChildProcess, exec } from 'child_process'
import strip from 'strip-ansi'
import isomorphicUnfetch from 'isomorphic-unfetch'

const waitForX = (condition: () => Promise<boolean> | boolean, message = '', timeout = 10): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    const retryPeriod = 0.5
    let tries = 0

    const interval: NodeJS.Timeout = setInterval(async () => {
      let conditionMet = false
      let recentError: Error | undefined

      try {
        conditionMet = await condition()
      } catch (err) {
        recentError = err
      }

      if (conditionMet && recentError === undefined) {
        clearInterval(interval)
        resolve()
      }

      if (tries >= timeout / retryPeriod) {
        clearInterval(interval)
        const err = recentError || new Error()
        const prefix = message || `Condition not met within ${timeout}s timeout`
        err.message = `${prefix} ${err}`
        return reject(err)
      }

      return tries++
    }, retryPeriod * 1000)
  })

const FIXTURE_FOLDER = './acceptance-tests/books-fixture'
export const CONFIG_FILE = `${FIXTURE_FOLDER}/config.yml`
export const SERVE_HOST = 'http://localhost:4000'

export const MESSAGE_RESTARTING = 'Restarting ncdc server'

type ServeResult = {
  getOutput(): string
  waitForOutput(target: string, timeout?: number): Promise<void>
  waitUntilAvailable(): Promise<void>
}

export type CleanupTask = () => void

export const fetch = (endpoint: string, init?: RequestInit): Promise<Response> =>
  isomorphicUnfetch(`${SERVE_HOST}${endpoint}`, init)

export const prepareServe = (cleanupTasks: CleanupTask[]) => async (
  checkAvailability = true,
  args = '',
): Promise<ServeResult> => {
  const command = `serve ${CONFIG_FILE} -c ${FIXTURE_FOLDER}/tsconfig.json ${args}`
  const process: ChildProcess = exec(`LOG_LEVEL=debug nyc --reporter lcov ./bin/ncdc ${command}`)
  const output: string[] = []
  const getRawOutput = (): string => output.join('')
  const formatOutput = (): string => strip(getRawOutput())

  process.stdout && process.stdout.on('data', (data) => output.push(data))
  process.stderr && process.stderr.on('data', (data) => output.push(data))
  let hasExited = false

  process.on('exit', (code, signal) => {
    hasExited = true
    if (code || signal !== 'SIGTERM') {
      const quickInfo = `Code: ${code} | Signal: ${signal}`
      throw new Error(`${quickInfo}\n\n${getRawOutput()}`)
    }
  })

  cleanupTasks.push(() => {
    if (process.killed || hasExited) return
    const killed = process.kill()
    if (!killed) throw new Error('Could not kill the ncdc serve process')
  })

  const waitForOutput: ServeResult['waitForOutput'] = (target) =>
    waitForX(
      () => formatOutput().includes(target),
      `Did not find the string "${target}" in the output\n\n${getRawOutput()}`,
    )

  const waitUntilAvailable: ServeResult['waitUntilAvailable'] = () =>
    waitForX(async () => {
      const { status } = await fetch('/')
      return status === 200
    }, `The ncdc server was not contactable\n\n${getRawOutput()}`)

  if (checkAvailability) await waitUntilAvailable()
  return { getOutput: formatOutput, waitForOutput, waitUntilAvailable }
}
