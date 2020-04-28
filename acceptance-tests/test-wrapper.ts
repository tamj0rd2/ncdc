import { ChildProcess, exec } from 'child_process'

export const FIXTURE_FOLDER = './acceptance-tests/test-fixture'
export const CONFIG_FILE = `${FIXTURE_FOLDER}/config.yml`
export const TSCONFIG_FILE = `${FIXTURE_FOLDER}/tsconfig.json`
export const REAL_SERVER_HOST = 'http://localhost:4000'

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
