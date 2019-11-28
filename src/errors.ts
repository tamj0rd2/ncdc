export class CustomError extends Error {
  constructor(error: Error | string) {
    super(typeof error === 'string' ? error : error.message)

    if (typeof error === 'string') {
      this.message = error
    } else {
      this.name = error.name
      this.message = error.message
      this.stack = error.stack
    }

    Object.setPrototypeOf(this, new.target.prototype) // restore prototype chain (TS thing)
  }
}
