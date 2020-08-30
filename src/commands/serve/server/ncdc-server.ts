import type { TypeValidator } from '~validation'
import { NcdcLogger } from '~logger'
import { configureApp } from './app'
import { Server } from 'http'
import { Resource } from '~config/types'

type GetTypeValidator = () => Promise<TypeValidator>

export default class NcdcServer {
  private server?: Server

  constructor(
    private readonly port: number,
    private readonly getTypeValidator: GetTypeValidator,
    private readonly logger: NcdcLogger,
  ) {}

  public async start(resources: Resource[]): Promise<void> {
    const baseUrl = `http://localhost:${this.port}`
    const app = configureApp(baseUrl, resources, this.getTypeValidator, this.logger)

    return new Promise((resolve) => {
      this.server = app.listen(this.port, () => {
        this.logger.info(`Endpoints are being served on ${baseUrl}`)
        resolve()
      })
    })
  }

  public async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) return resolve()

      this.server.close((err) => {
        if (err && (err as NodeJS.ErrnoException).code !== 'ERR_SERVER_NOT_RUNNING') {
          return reject(err)
        }

        return resolve()
      })
    })
  }
}
