import { exec, ChildProcess } from 'child_process'
import strip from 'strip-ansi'
import { copyFileSync, readFileSync, writeFileSync, unlinkSync as deleteFileSync } from 'fs'
import fetch from 'isomorphic-unfetch'

jest.disableAutomock()
jest.setTimeout(45000)

const FIXTURE_FOLDER = './acceptance-tests/books-fixture'
const TEMPLATE_FILE = `${FIXTURE_FOLDER}/config.template.yml`
const CONFIG_FILE = `${FIXTURE_FOLDER}/config.yml`
const SERVE_HOST = 'http://localhost:4000'
const MESSAGE_RESTARTING = 'Restarting ncdc server'

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
        const prefix = message || `Condition not met within ${timeout}s timeout`
        err.message = `${prefix} ${err}`
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

  const startServing = async (checkAvailability = true, args = ''): Promise<ServeResult> => {
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
        const { status } = await fetch(SERVE_HOST)
        return status === 200
      }, `The ncdc server was not contactable\n\n${getRawOutput()}`)

    if (checkAvailability) await waitUntilAvailable()
    return { getOutput: formatOutput, waitForOutput, waitUntilAvailable }
  }

  it('starts serving on port 4000', async () => {
    // arrange
    copyFileSync(TEMPLATE_FILE, CONFIG_FILE)

    // act
    const { getOutput } = await startServing()
    const res = await fetch(`${SERVE_HOST}/api/books/hooray`)
    const output = getOutput()

    // assert
    expect(output).toContain(`Registered ${SERVE_HOST}/api/books/* from config: Books`)
    expect(output).toContain(`Endpoints are being served on ${SERVE_HOST}`)
    expect(output).not.toContain('Restarting ncdc serve')
    expect(res.status).toBe(200)
  })

  it('restarts when config.yml is changed', async () => {
    // arrange
    const baseConfig = readFileSync(TEMPLATE_FILE, 'utf-8')
    writeFileSync(CONFIG_FILE, baseConfig)

    const { waitForOutput, waitUntilAvailable } = await startServing()
    const resInitial = await fetch(`${SERVE_HOST}/api/books/789`)
    expect(resInitial.status).toBe(200)

    // act
    const editedConfig = baseConfig.replace('code: 200', 'code: 234')
    writeFileSync(CONFIG_FILE, editedConfig)
    await waitForOutput('Restarting ncdc serve')
    await waitUntilAvailable()
    const resPostEdit = await fetch(`${SERVE_HOST}/api/books/789`)

    // assert
    expect(resPostEdit.status).toBe(234)
  })

  it('logs a message and kills the server when config.yml has been deleted', async () => {
    // arrange
    copyFileSync(TEMPLATE_FILE, CONFIG_FILE)
    const { getOutput, waitForOutput } = await startServing()
    const resInitial = await fetch(`${SERVE_HOST}/api/books/yay`)
    expect(resInitial.status).toBe(200)

    // act
    deleteFileSync(CONFIG_FILE)
    await waitForOutput('Restarting ncdc serve')
    await waitForOutput('Could not start server')
    const output = getOutput()

    // assert
    expect(output).toMatch(/no such file or directory .+config\.yml/)
    await expect(fetch(`${SERVE_HOST}/api/books/yay`)).rejects.toThrowError()
  })

  // TODO: refactor these tests to use js-yaml safeDump and config builder
  it.only('can recover from config.yml being deleted when file is re-added', async () => {
    // arrange
    const baseConfig = readFileSync(TEMPLATE_FILE, 'utf-8')
    writeFileSync(CONFIG_FILE, baseConfig)

    const { waitForOutput } = await startServing()
    deleteFileSync(CONFIG_FILE)
    await waitForOutput('Could not start server')

    // // act
    const editedConfig = baseConfig.replace('name: Books', 'name: Cooks').replace('code: 200', 'code: 404')
    writeFileSync(CONFIG_FILE, editedConfig)

    // // assert
    await waitForOutput(`Registered ${SERVE_HOST}/api/books/* from config: Cooks`)
    const { status } = await fetch(`${SERVE_HOST}/api/books/noice`)
    expect(status).toEqual(404)
  })

  it.todo('restarts the server when a path referenced by the config file changes')

  // TODO: oooooh. This could actually have a caching folder!!! Then generate
  // would just become the default :D
  // typescript-json-schema getSourceFile could really help with this too

  it.todo('restarts when a source file containing types changes')
})
