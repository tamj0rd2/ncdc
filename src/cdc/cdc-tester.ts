import { AxiosInstance, AxiosError } from 'axios'
import { TestConfig } from '../config'
import TypeValidator from '../validation/type-validator'
import { doItAll, ValidationFlags, GetResponse, TestFn } from '../validation/validators'
import { errorNoResponse, errorBadStatusCode, errorWrongStatusCode } from '../messages'

export default class CDCTester {
  public test: TestFn<TestConfig>

  constructor(loader: AxiosInstance, typeValidator: TypeValidator) {
    const getResponse: GetResponse = async ({ request, response }) => {
      const { method, endpoint, body } = request
      const { code } = response
      try {
        switch (method) {
          case 'GET':
            return await loader.get(endpoint)
          case 'POST':
            return await loader.post(endpoint, body)
        }
      } catch (err) {
        const axiosErr = err as AxiosError
        const fullUri = loader.defaults.baseURL + endpoint

        if (!axiosErr.response) throw new Error(errorNoResponse(fullUri))

        if (!code) throw new Error(errorBadStatusCode(fullUri, axiosErr.response.status))

        if (code !== axiosErr.response.status)
          throw new Error(errorWrongStatusCode(fullUri, code, axiosErr.response.status))

        return axiosErr.response
      }
    }

    this.test = doItAll(typeValidator, getResponse, ValidationFlags.All)
  }
}
