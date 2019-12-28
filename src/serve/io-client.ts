import { Data, DataObject } from '../types'
import { FetchResource } from '../validation/validators'
import { MockConfig } from '../config'
import { readFile } from 'fs'

export default class IOClient {
  private responseMap = new Map<string, Optional<Data>>()

  public fetch: FetchResource<MockConfig> = async ({ name, ...config }) => {
    const { code, mockPath, mockBody, body } = config.response

    let data = this.responseMap.get(name)
    if (!data) {
      data = mockPath ? await this.readJsonAsync(mockPath) : mockBody ?? body
      this.responseMap.set(name, data)
    }

    return Promise.resolve({ status: code, data })
  }

  private readJsonAsync(path: string): Promise<DataObject | Data[]> {
    return new Promise<DataObject | Data[]>((resolve, reject) => {
      readFile(path, (err, data) => {
        if (err) return reject(err)

        try {
          resolve(JSON.parse(data.toString()))
        } catch (err) {
          reject(err)
        }
      })
    })
  }
}
