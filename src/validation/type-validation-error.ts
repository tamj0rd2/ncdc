import Problem from '../problem'

export class TypeValidationError extends Error {
  public readonly problems: ROPopulatedArray<Problem>

  constructor(message: string, problems: PopulatedArray<Problem>) {
    super(message)
    Object.setPrototypeOf(this, new.target.prototype)
    this.name = 'TypeValidationError'
    this.problems = problems
  }
}
