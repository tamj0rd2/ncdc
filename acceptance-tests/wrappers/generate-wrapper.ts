import { ChildProcess, exec } from 'child_process'
import stripAnsi from 'strip-ansi'
import { NCDC_CONFIG_FILE, JSON_SCHEMAS_FOLDER, TSCONFIG_FILE, NCDC_EXEC } from './config-wrapper'

export const runGenerateCommand = (): Promise<string> =>
  new Promise<string>((resolve) => {
    const command = `LOG_LEVEL=debug ${NCDC_EXEC} generate ${NCDC_CONFIG_FILE} --output ${JSON_SCHEMAS_FOLDER} -c ${TSCONFIG_FILE}`
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
