import { ChildProcess, exec } from 'child_process'
import stripAnsi from 'strip-ansi'
import { NCDC_CONFIG_FILE, JSON_SCHEMAS_FOLDER, TSCONFIG_FILE, ENTRYPOINT } from './config-wrapper'

const createCommand = (extraConfigPath?: string): string => {
  const configPaths = extraConfigPath ? [NCDC_CONFIG_FILE, extraConfigPath] : [NCDC_CONFIG_FILE]
  const configArg = configPaths.join(' ')
  return `${ENTRYPOINT} generate ${configArg} --output ${JSON_SCHEMAS_FOLDER} -c ${TSCONFIG_FILE} -v`
}

export const runGenerateCommand = (extraConfigPath?: string): Promise<string> =>
  new Promise<string>((resolve) => {
    const ncdc: ChildProcess = exec(createCommand(extraConfigPath))
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
