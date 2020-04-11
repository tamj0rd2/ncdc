import { exec, ChildProcess } from 'child_process'
import strip from 'strip-ansi'
import { copyFileSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import fetch from 'isomorphic-unfetch'
import { red } from 'chalk'

jest.disableAutomock()
jest.setTimeout(20000)

// TODO: completely get rid of axios

const FIXTURE_FOLDER = './acceptance-tests/books-fixture'
const TEMPLATE_FILE = `${FIXTURE_FOLDER}/config.template.yml`
const CONFIG_FILE = `${FIXTURE_FOLDER}/config.yml`
const SERVE_HOST = 'http://localhost:4000'

type ServeResult = {
  getOutput(): string
  waitForOutput(target: string, timeout?: number): Promise<void>
  waitUntilAvailable(): Promise<void>
}

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
        const prefix = red(message || `Condition not met within ${timeout}s timeout`)
        err.message = `${prefix} ${err.stack}`
        return reject(err)
      }

      return tries++
    }, retryPeriod * 1000)
  })

describe('ncdc serve', () => {
  const cleanupTasks: (() => void)[] = []

  afterEach(() => {
    while (cleanupTasks.length) {
      const task = cleanupTasks.shift()
      task && task()
    }
  })

  const startServing = async (args = ''): Promise<ServeResult> => {
    const command = `serve ${CONFIG_FILE} -c ${FIXTURE_FOLDER}/tsconfig.json ${args}`
    const process: ChildProcess = exec(`nyc --reporter lcov ./bin/ncdc ${command}`)
    const output: string[] = []
    const formatOutput = (): string => strip(output.join(''))

    process.stdout && process.stdout.on('data', (data) => output.push(data))
    process.stderr && process.stderr.on('data', (data) => output.push(data))
    let hasExited = false

    process.on('exit', (code, signal) => {
      hasExited = true
      if (code || signal !== 'SIGTERM') {
        const quickInfo = red(`Code: ${code} | Signal: ${signal}`)
        throw new Error(`${quickInfo}\n\n${output.join('')}`)
      }
    })

    cleanupTasks.push(() => {
      if (process.killed || hasExited) return
      const killed = process.kill()
      if (!killed) throw new Error('Could not kill the ncdc serve process')
    })

    const waitForOutput: ServeResult['waitForOutput'] = (target) =>
      waitForX(() => formatOutput().includes(target), `Did not find the string "${target}" in the output`)

    const waitUntilAvailable: ServeResult['waitUntilAvailable'] = () =>
      waitForX(async () => {
        const { status } = await fetch(SERVE_HOST)
        return status === 200
      })

    try {
      await waitUntilAvailable()
    } catch (err) {
      err.message = `${red('ncdc did not start serving within the 10s timeout')}\n\n${err.stack}`
      throw err
    }

    return { getOutput: formatOutput, waitForOutput, waitUntilAvailable }
  }

  it('starts serving on port 4000', async () => {
    copyFileSync(TEMPLATE_FILE, CONFIG_FILE)
    const { getOutput } = await startServing()

    const res = await fetch(`${SERVE_HOST}/api/books/hooray`)
    const output = getOutput()

    expect(output).toContain(`Registered ${SERVE_HOST}/api/books/* from config: Books`)
    expect(output).toContain(`Endpoints are being served on ${SERVE_HOST}`)
    expect(res.status).toBe(200)
  })

  it('restarts when config.yml is changed', async () => {
    const baseConfig = readFileSync(TEMPLATE_FILE, 'utf-8')
    writeFileSync(CONFIG_FILE, baseConfig)

    const { waitForOutput, waitUntilAvailable } = await startServing()
    const resInitial = await fetch(`${SERVE_HOST}/api/books/789`)
    expect(resInitial.status).toBe(200)

    const editedConfig = baseConfig.replace('code: 200', 'code: 234')
    writeFileSync(CONFIG_FILE, editedConfig)
    await waitForOutput('Restarting ncdc serve')
    await waitUntilAvailable()

    const resPostEdit = await fetch(`${SERVE_HOST}/api/books/789`)
    expect(resPostEdit.status).toBe(234)
  })

  it('logs a message and kills the server when config.yml has been deleted', async () => {
    const baseConfig = readFileSync(TEMPLATE_FILE, 'utf-8')
    writeFileSync(CONFIG_FILE, baseConfig)

    const { getOutput, waitForOutput } = await startServing()
    const resInitial = await fetch(`${SERVE_HOST}/api/books/yay`)
    expect(resInitial.status).toBe(200)

    unlinkSync(CONFIG_FILE)
    await waitForOutput('Restarting ncdc serve')
    await waitForOutput('Could not start server')
    const output = getOutput()

    // Assert
    expect(output).toMatch(/no such file or directory .+config\.yml/)
    await expect(fetch(`${SERVE_HOST}/api/books/yay`)).rejects.toThrowError()
  })

  it.todo('can recover from config.yml being deleted')
  it.todo('restarts the server when a path referenced by the config file changes')

  // TODO: oooooh. This could actually have a caching folder!!! Then generate
  // would just become the default :D
  // typescript-json-schema getSourceFile could really help with this too

  it.todo('restarts when a source file containing types changes')
})
