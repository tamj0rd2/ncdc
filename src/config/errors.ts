import { red } from 'chalk'

export class ServiceConfigReadError extends Error {
  constructor(filePath: string, message: string) {
    super(`There was a problem reading your service config file (${filePath}): ${message}`)
    Object.setPrototypeOf(this, ServiceConfigReadError.prototype)
  }
}

export class ServiceConfigInvalidError extends Error {
  constructor(filePath: string, validationErrors: string[]) {
    super(`Invalid service config file (${filePath}):\n${validationErrors.join('\n')}`)
    Object.setPrototypeOf(this, ServiceConfigInvalidError.prototype)
  }
}

export class NoServiceResourcesError extends Error {
  constructor(filePath: string) {
    super(`No resources for service config file (${filePath})`)
    Object.setPrototypeOf(this, NoServiceResourcesError.prototype)
  }

  public formatCustomMessage(message: string): string {
    return red(message)
  }
}

export class BodyValidationError extends Error {
  constructor(filePath: string, message: string) {
    super(`An error occurred while validating a fixture within ${filePath}:\n${message}`)
    Object.setPrototypeOf(this, BodyValidationError.prototype)
  }
}

export class InvalidBodyTypeError extends Error {
  constructor(filePath: string, message: string) {
    super(`One or more of your configured fixtures do not match the correct type:\n\n${message}`)
    Object.setPrototypeOf(this, InvalidBodyTypeError.prototype)
  }
}
