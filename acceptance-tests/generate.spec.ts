import strip from 'strip-ansi'
import { runGenerateCommand } from './wrappers/generate-wrapper'
import { ConfigWrapper } from './wrappers/config-wrapper'
import { ConfigBuilder } from './config-builder'

jest.useRealTimers()
jest.setTimeout(10000)

describe('ncdc generate', () => {
  it('can run the generate command', async () => {
    new ConfigWrapper()
      .addConfig(
        new ConfigBuilder()
          .withName('Shorts')
          .withEndpoints('/api/resource')
          .withResponseType('RTypeDelta')
          .withResponseHeaders({ 'content-type': 'text/plain' })
          .build(),
      )
      .addType('RTypeDelta', { greeting: 'string' })

    const output = await runGenerateCommand()

    expect(strip(output)).toContain(`JSON schemas have been written to disk`)
  })

  it('handles a case where a type does not exist gracefully', async () => {
    new ConfigWrapper().addConfig(
      new ConfigBuilder()
        .withName('Shorts')
        .withEndpoints('/api/resource')
        .withResponseType('RTypeDelta')
        .withResponseHeaders({ 'content-type': 'text/plain' })
        .build(),
    )

    const output = await runGenerateCommand()

    expect(strip(output)).toContain('error: type RTypeDelta not found')
  })
})
