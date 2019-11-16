import { Command } from 'commander'
import { readFileSync } from 'fs'
import chalk from 'chalk'
import Ajv from 'ajv'

const handleError = (message: string, err: Error | string): never => {
  console.error(chalk.bold(message))
  console.error(chalk.red(typeof err === 'string' ? err : err.stack))
  process.exit(1)
}

const tryParseJson = (path: string): object => {
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

interface CLI extends Command {
  allErrors: boolean
}

export default function run(): void {
  // parse arguments
  let jsonPath = ''
  let schemaPath = ''

  const program = new Command() as CLI

  program
    .version('0.0.1')
    .arguments('<pathToJson> <pathToJsonSchema>')
    .option('-a --allErrors', 'show all validation errors', false)
    .action((json: string, schema: string) => {
      jsonPath = json
      schemaPath = schema
    })
    .parse(process.argv)

  // validate
  const json = tryParseJson(jsonPath)
  const schema = tryParseJson(schemaPath)

  const validator = new Ajv({ allErrors: program.allErrors })
  const isValid = validator.validate(schema, json)

  if (isValid) {
    console.log('Validation was successful')
  } else {
    handleError('Validation failed', validator.errorsText())
  }
}
