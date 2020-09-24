import { runGenerateCommand } from '~shared/generate-wrapper'
import { ConfigWrapper, TEST_ENV, TYPES_FILE } from '~shared/config-wrapper'
import { ConfigBuilder } from '~shared/config-builder'
import { writeFileSync } from 'fs'
import './jest-extensions'

jest.useRealTimers()
jest.setTimeout(10000)

describe('ncdc generate', () => {
  it('can run the generate command', async () => {
    new ConfigWrapper()
      .addTsconfig()
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

    expect(output).toContain(`JSON schemas have been written to disk`)
    expect(output).toMatchStrippedSnapshot()
  })

  // TODO: now that multiple configs are a thing, this whole config wrapping thing definitely needs a redo
  it('can generate multiple configs', async () => {
    new ConfigWrapper()
      .addTsconfig()
      .addConfig(new ConfigBuilder().withName('Shorts').withResponseType('RTypeDelta').build())
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

    expect(output).toContain(`JSON schemas have been written to disk`)
    expect(output).toMatchStrippedSnapshot()
  })

  it('handles a case where a type does not exist gracefully', async () => {
    new ConfigWrapper()
      .addTsconfig()
      .addConfig(
        new ConfigBuilder()
          .withName('Shorts')
          .withEndpoints('/api/resource')
          .withResponseType('RTypeDelta')
          .withResponseHeaders({ 'content-type': 'text/plain' })
          .build(),
      )

    const output = await runGenerateCommand()

    expect(output).toContain('error: Could not find type: RTypeDelta')
  })

  it('can run the generate command with noEmit false and composite true', async () => {
    new ConfigWrapper()
      .addTsconfig()
      .addTsconfig({
        ...ConfigWrapper.DefaultTsconfig,
        compilerOptions: {
          ...ConfigWrapper.DefaultTsconfig.compilerOptions,
          noEmit: false,
          composite: true,
          incremental: undefined,
        },
      })
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

    expect(output).toContain(`JSON schemas have been written to disk`)
    expect(output).toMatchStrippedSnapshot()
  })
})
