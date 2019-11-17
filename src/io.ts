import chalk from 'chalk'
import { readFileSync } from 'fs'

const handleError = (message: string, err?: Error | string): never => {
  console.error(chalk.bold(message))
  if (err) console.error(chalk.red(typeof err === 'string' ? err : err.stack))
  process.exit(1)
}

export const tryParseJson = (path: string): Promise<any> => {
  let rawFile: string

  try {
    rawFile = readFileSync(path).toString()
  } catch (err) {
    return handleError(`Encountered an error while reading from ${path}`, err)
  }

  try {
    return JSON.parse(rawFile)
  } catch (err) {
    return handleError(`Encountered an error while reading from ${path}`, err)
  }
}
