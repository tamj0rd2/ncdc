import { ChildProcess, exec } from 'child_process'
import strip from 'strip-ansi'
import isomorphicUnfetch from 'isomorphic-unfetch'

const waitForX = (condition: () => Promise<boolean> | boolean): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    const timeout = 10
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
        err.message = `Condition not met within ${timeout}s timeout} ${err}`
        return reject(err)
      }

      return tries++
    }, retryPeriod * 1000)
  })

export const FIXTURE_FOLDER = './acceptance-tests/books-fixture'
export const CONFIG_FILE = `${FIXTURE_FOLDER}/config.yml`
export const SERVE_HOST = 'http://localhost:4000'

export const MESSAGE_RESTARTING = 'Restarting ncdc serve'

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
  let hasExited = false
  const command = `LOG_LEVEL=debug ./bin/ncdc serve ${CONFIG_FILE} -c ${FIXTURE_FOLDER}/tsconfig.json ${args}`
  const ncdc: ChildProcess = exec(command, (error, stdout, stderr) => {
    hasExited = true

    if (error && error.signal !== 'SIGTERM') {
      const quickInfo = `Code: ${error.code} | Signal: ${error.signal}`
      throw new Error(`${quickInfo}\n\nOutput:${stdout}\n${stderr}`)
    }
  })
  const output: string[] = []
  const getRawOutput = (): string => output.join('')
  const getStrippedOutput = (): string => strip(getRawOutput())

  ncdc.stdout && ncdc.stdout.on('data', (data) => output.push(data))
  ncdc.stderr && ncdc.stderr.on('data', (data) => output.push(data))

  const cleanup = (): void => {
    if (ncdc.killed || hasExited) return
    hasExited = true
    const killed = ncdc.kill()
    if (!killed) console.error('Could not kill the ncdc serve process')
  }

  cleanupTasks.push(cleanup)

  const failNicely = (message: string, err: Error): never => {
    console.error(`${message}. Output:\n\n${getStrippedOutput()}`)
    cleanup()
    throw err
  }

  const waitForOutput: ServeResult['waitForOutput'] = (target) =>
    waitForX(() => getStrippedOutput().includes(target)).catch((err) =>
      failNicely(`Did not find the string "${target}" in the output}`, err),
    )

  const waitUntilAvailable: ServeResult['waitUntilAvailable'] = () =>
    waitForX(async () => {
      const { status } = await fetch('/')
      return status === 200
    }).catch((err) => failNicely(`The ncdc server was not contactable at ${SERVE_HOST}/`, err))

  if (checkAvailability) await waitUntilAvailable()
  return { getOutput: getStrippedOutput, waitForOutput, waitUntilAvailable }
}
