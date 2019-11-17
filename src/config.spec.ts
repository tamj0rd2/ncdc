import NConfig from './config'

describe('config', () => {
  it('validates values properly', () => {
    const config = {
      tests: [
        {
          name: 'A normal blah',
          request: {
            endpoint: '/api/blah',
            bero: 123,
            method: 'PERO, PERO',
          },
          response: {
            code: 200,
            type: 'DealSchema',
          },
          unknownthingy: 'hjelo!',
        },
      ],
    }

    expect(() => NConfig.fromJSON(config)).toThrow()
  })
})
