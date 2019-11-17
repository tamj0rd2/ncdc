import NConfig from './config'

describe('config', () => {
  it('validates values properly', () => {
    const config = [
      {
        name: 'A normal blah',
        request: {
          endpoint: '/api/blah',
          hey: 123,
          method: 'u wot',
        },
        response: {
          code: 200,
          type: 'DealSchema',
        },
        woah: {},
      },
    ]

    expect(() => new NConfig(config)).toThrow()
  })
})
