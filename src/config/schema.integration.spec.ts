import { getConfigSchema } from './schema'
import { Mode } from './types'

jest.disableAutomock()

// TODO: save this for the big config rewrite. god it hurts my head.
describe.skip('serve mode', () => {
  it('throws when serveBody and serveBodyPath are both specified', async () => {
    const config = {
      name: 'config',
      request: {
        method: 'GET',
        endpoints: [],
      },
      response: {
        code: 123,
        serveBody: 'some body',
        serveBodyPath: 'response.json',
      },
    }

    await expect(getConfigSchema(Mode.Serve).validate(config)).rejects.toThrowError(
      'request.serveBodyPath is not allowed',
    )
  })
})
