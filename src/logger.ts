import chalk from 'chalk'

export default class Logger {
  public error(message: string): void {
    console.error(message)
  }

  public logValidationSuccess(testName: string): void {
    console.log(chalk.green.bold('PASSED:'), chalk.green(testName))
  }

  public logIncorrectStatusCode(testName: string, expected: number, received: number): void {
    this.logFailed(testName, `Expected status ${chalk.green(expected)} but received ${chalk.red(received)}`)
  }

  public logUnsupportedOperation(testName: string, message: string): void {
    this.logFailed(testName, message)
  }

  public logIncorrectBody(testName: string, expected: string, received: string): void {
    this.logFailed(testName, `Expected body ${chalk.green(expected)} but received ${chalk.red(received)}`)
  }

  private logFailed(testName: string, message: string): void {
    console.error(chalk.red.bold('FAILED:'), chalk.red(testName))
    console.log(message)
  }
}
