import { ConfigBuilder } from './config-helpers'
import strip from 'strip-ansi'
import { runGenerateCommand, GenerateConfigWrapper } from './generate-wrapper'

jest.useRealTimers()
jest.setTimeout(10000)

describe('ncdc generate', () => {
  it('can run the generate command', async () => {
    new GenerateConfigWrapper()
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
    new GenerateConfigWrapper().addConfig(
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
