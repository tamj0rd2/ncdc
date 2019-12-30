import { Data, DataObject } from '../types'
import { FetchResource } from '../validation/validators'
import { MockConfig } from '../config'
import { readJsonAsync } from '../io'

export default class IOClient {
  private responseMap = new Map<string, Optional<Data>>()

  public fetch: FetchResource<MockConfig> = async ({ name, ...config }) => {
    const { code, mockPath, mockBody, body } = config.response

    let data = this.responseMap.get(name)
    if (!data) {
      data = mockPath ? await readJsonAsync<DataObject | Data[]>(mockPath) : mockBody ?? body
      this.responseMap.set(name, data)
    }

    return Promise.resolve({ status: code, data })
  }
}
