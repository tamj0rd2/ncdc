import { ValidatedRawConfig } from './validate'
import { randomString } from '~test-helpers'

export class ValidatedRawConfigBuilder {
  public static get default(): ValidatedRawConfig {
    return new ValidatedRawConfigBuilder().build()
  }

  public build(): ValidatedRawConfig {
    return {
      request: {
        bodyPath: randomString('bodyPath'),
        endpoints: [randomString('endpoint1')],
        type: randomString('type'),
      },
      response: {
        bodyPath: randomString('bodyPath'),
        serveBodyPath: randomString('serveBodyPath'),
        type: randomString('type'),
      },
      serveOnly: false,
    }
  }
}
