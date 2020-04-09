import { exec } from 'child_process'
import strip from 'strip-ansi'

jest.disableAutomock()

const serve = async (timeoutSeconds = 10): Promise<{ stdout: string; stderr: string }> => {
  const fixtureFolder = './acceptance-tests/books-fixture'
  const command = `serve ${fixtureFolder}/config.yml -c ${fixtureFolder}/tsconfig.json`

  return new Promise((resolve, reject) => {
    const process = exec(`nyc --reporter lcov ./bin/ncdc ${command}`, (err, stdout, stderr) => {
      if (err?.signal === 'SIGTERM') {
        return resolve({ stdout: strip(stdout), stderr: strip(stderr) })
      }
      return reject(err)
    })

    setTimeout(() => {
      process.kill()
    }, timeoutSeconds * 1000)
  })
}

it('starts serving on port 4000', async () => {
  const { stdout, stderr } = await serve()

  expect(stdout).toContain('Registered http://localhost:4000/api/books/* from config: Books')
  expect(stdout).toContain('Endpoints are being served on http://localhost:4000')
  expect(stderr).toEqual('')
}, 15000)
