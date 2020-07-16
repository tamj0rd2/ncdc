import { ChildProcess, exec } from 'child_process'
import { Server } from 'http'
import express from 'express'
import stripAnsi from 'strip-ansi'
import { NCDC_CONFIG_FILE, TSCONFIG_FILE } from './config-wrapper'

export const REAL_SERVER_HOST = 'http://localhost:5000'

export interface TestResult {
  success: boolean
  output: string
}

export const runTestCommand = (args = ''): Promise<TestResult> =>
  new Promise<TestResult>((resolve) => {
    const command = `./bin/ncdc test ${NCDC_CONFIG_FILE} ${REAL_SERVER_HOST} -c ${TSCONFIG_FILE} ${args} -v`
    const ncdc: ChildProcess = exec(command)
    const output: string[] = []
    const getOutput = (): string => stripAnsi(output.join(''))

    ncdc.stdout && ncdc.stdout.on('data', (data) => output.push(data))
    ncdc.stderr && ncdc.stderr.on('data', (data) => output.push(data))
    ncdc.on('exit', (code, signal) => {
      if (code !== 0) {
        const quickInfo = `Code: ${code} | Signal: ${signal}`
        return resolve({ success: false, output: `${quickInfo} | Output:\n\n${getOutput()}` })
      }

      resolve({ success: true, output: getOutput() })
    })
  })

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

  public withPostEndpoint(endpoint: string, status: number, content: unknown): RealServerBuilder {
    this.app.post(endpoint, (req, res) => {
      res.status(status).send(content)
    })
    return this
  }

  public start(): Server {
    return this.app.listen(this.port)
  }
}
