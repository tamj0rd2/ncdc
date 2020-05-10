import { WatchingSchemaGenerator } from './watching-schema-generator'
import { randomString } from '~test-helpers'

jest.disableAutomock()

describe('load', () => {
  it('throws an error if watching has not started yet', () => {
    const generator = new WatchingSchemaGenerator(randomString('tsconfig path'))

    expect(() => generator.load(randomString('my type'))).toThrowError('Watching has not started yet')
  })
})
