import { ChildProcess, exec } from 'child_process'
import { ConfigWrapper } from './config-helpers'
import { Server } from 'http'
import express from 'express'

export const FIXTURE_FOLDER = './acceptance-tests/test-fixture'
export const CONFIG_FILE = `${FIXTURE_FOLDER}/config.yml`
export const TSCONFIG_FILE = `${FIXTURE_FOLDER}/tsconfig.json`
export const REAL_SERVER_HOST = 'http://localhost:5000'

export const runTestCommand = (): Promise<string> =>
  new Promise<string>((resolve, reject) => {
    const command = `LOG_LEVEL=debug ./bin/ncdc test ${CONFIG_FILE} ${REAL_SERVER_HOST} -c ${TSCONFIG_FILE}`
    const ncdc: ChildProcess = exec(command)
    const output: string[] = []
    const getRawOutput = (): string => output.join('')

    ncdc.stdout && ncdc.stdout.on('data', (data) => output.push(data))
    ncdc.stderr && ncdc.stderr.on('data', (data) => output.push(data))
    ncdc.on('exit', (code, signal) => {
      if (code !== 0 && signal !== 'SIGTERM') {
        const quickInfo = `Code: ${code} | Signal: ${signal}`
        const err = new Error(`${quickInfo} | Output:\n\n${getRawOutput()}`)
        return reject(err)
      }

      resolve(getRawOutput())
    })
  })

export class TestConfigWrapper extends ConfigWrapper {
  constructor() {
    super(CONFIG_FILE, FIXTURE_FOLDER)
  }
}

export class RealServerBuilder {
  private readonly app = express()
  private port = 5000

  public withPort(port: number): RealServerBuilder {
    this.port = port
    return this
  }

  public withGetEndpoint(endpoint: string, status: number, content: unknown): RealServerBuilder {
    this.app.get(endpoint, (req, res) => {
      res.status(status).send(content)
    })
    return this
  }

  public start(): Server {
    return this.app.listen(this.port)
  }
}
