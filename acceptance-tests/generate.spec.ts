import strip from 'strip-ansi'
import { runGenerateCommand } from './wrappers/generate-wrapper'
import { ConfigWrapper, TEST_ENV, TYPES_FILE } from './wrappers/config-wrapper'
import { ConfigBuilder } from './config-builder'
import { writeFileSync } from 'fs'

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

  // TODO: now that multiple configs are a thing, this whole config wrapping thing definitely needs a redo
  it('can generate multiple configs', async () => {
    new ConfigWrapper().addConfig(
      new ConfigBuilder().withName('Shorts').withResponseType('RTypeDelta').build(),
    )
    const config2Path = `${TEST_ENV}/config2.yml`
    new ConfigWrapper(config2Path, true).addConfig(
      new ConfigBuilder().withName('Balloons').withResponseType('CrashBash').build(),
    )

    const types = {
      RTypeDelta: { greeting: 'string' },
      CrashBash: { yeeting: 'number' },
    }
    const fullContent =
      Object.entries(types).reduce((accum, [name, content]) => {
        return (
          accum +
          `interface ${name} {\n${Object.entries(content)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n')}}\n`
        )
      }, '') + '\nexport {}'

    writeFileSync(TYPES_FILE, fullContent)

    const output = await runGenerateCommand(config2Path)

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

    expect(strip(output)).toContain('error: Could not find type: RTypeDelta')
  })
})
