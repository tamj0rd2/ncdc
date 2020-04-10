import { exec, ChildProcess } from 'child_process'
import strip from 'strip-ansi'
import { copyFileSync, readFileSync, writeFileSync, stat } from 'fs'
import axios from 'axios'
import { red } from 'chalk'

jest.disableAutomock()

const FIXTURE_FOLDER = './acceptance-tests/books-fixture'
const TEMPLATE_FILE = `${FIXTURE_FOLDER}/config.template.yml`
const CONFIG_FILE = `${FIXTURE_FOLDER}/config.yml`

const wait = (seconds: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, seconds * 1000)
  })

const serve = (args = ''): (() => Promise<string>) => {
  const command = `serve ${CONFIG_FILE} -c ${FIXTURE_FOLDER}/tsconfig.json ${args}`
  const process: ChildProcess = exec(`nyc --reporter lcov ./bin/ncdc ${command}`)

  const outputPromise = new Promise<string>((resolve, reject) => {
    const output: string[] = []

    const onOutput = (data: any) => output.push(strip(data.toString()))
    process.stdout!.on('data', onOutput)
    process.stderr!.on('data', onOutput)

    process.on('exit', (code, signal) => {
      const formattedOut = output.join('\n')

      if (code || signal !== 'SIGTERM') {
        const quickInfo = red(`Code: ${code} | Signal: ${signal}`)
        return reject(new Error(`${quickInfo}\n\n${formattedOut}`))
      }

      return resolve(formattedOut)
    })
  })

  return () => {
    process.kill()
    return outputPromise
  }
}

describe('ncdc serve', () => {
  it('starts serving on port 4000', async () => {
    copyFileSync(TEMPLATE_FILE, CONFIG_FILE)

    const getOutput = serve()
    await wait(7)
    const res = await axios.get('http://localhost:4000/api/books/hooray')
    const output = await getOutput()

    expect(output).toContain('Registered http://localhost:4000/api/books/* from config: Books')
    expect(output).toContain('Endpoints are being served on http://localhost:4000')
    expect(res.status).toBe(200)
  }, 10000)

  describe('when --watch is specified', () => {
    it('restarts when config.yml is changed', async () => {
      // Arrange
      const baseConfig = readFileSync(TEMPLATE_FILE, 'utf-8')
      writeFileSync(CONFIG_FILE, baseConfig)
      const editedConfig = baseConfig.replace('code: 200', 'code: 234')

      const getOutput = serve('--watch')
      await wait(7)
      const res1 = await axios.get('http://localhost:4000/api/books/789')
      expect(res1.status).toBe(200)

      writeFileSync(CONFIG_FILE, editedConfig)
      await wait(7)
      const res = await axios.get('http://localhost:4000/api/books/789')
      const output = await getOutput()

      // Assert
      expect(output).toContain('Restarting server')
      expect(res.status).toBe(234)
    }, 20000)
  })
})
