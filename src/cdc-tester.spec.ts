jest.mock('fs')

describe('cdc tester', () => {
  it('validates a json response against a schema', () => {
    const validator = jest.fn().mockReturnValue({ isValid: true })
    const getResponse = jest.fn().mockReturnValue({ age: 47, name: 'Jasper' })

  })
})
