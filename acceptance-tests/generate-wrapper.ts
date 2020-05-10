import { ChildProcess, exec } from 'child_process'
import { ConfigWrapper } from './config-helpers'
import stripAnsi from 'strip-ansi'

export const FIXTURE_FOLDER = './acceptance-tests/generate-fixture'
export const CONFIG_FILE = `${FIXTURE_FOLDER}/config.yml`
export const TSCONFIG_FILE = `${FIXTURE_FOLDER}/tsconfig.json`
export const OUTPUT_PATH = `${FIXTURE_FOLDER}/json-schemas`

export const runGenerateCommand = (): Promise<string> =>
  new Promise<string>((resolve) => {
    const command = `LOG_LEVEL=debug ./bin/ncdc generate ${CONFIG_FILE} --output ${OUTPUT_PATH} -c ${TSCONFIG_FILE}`
    const ncdc: ChildProcess = exec(command)
    const output: string[] = []
    const getRawOutput = (): string => output.join('')

    ncdc.stdout && ncdc.stdout.on('data', (data) => output.push(data))
    ncdc.stderr && ncdc.stderr.on('data', (data) => output.push(data))
    ncdc.on('exit', (code, signal) => {
      if (code !== 0 && signal !== 'SIGTERM') {
        const quickInfo = `Code: ${code} | Signal: ${signal}`
        return resolve(`${quickInfo} | Output:\n\n${stripAnsi(getRawOutput())}`)
      }

      resolve(getRawOutput())
    })
  })

export class GenerateConfigWrapper extends ConfigWrapper {
  constructor() {
    super(CONFIG_FILE, FIXTURE_FOLDER)
  }
}
