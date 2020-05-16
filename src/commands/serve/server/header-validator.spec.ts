import { areHeadersValid, HeaderValidationResult } from './header-validator'

jest.disableAutomock()

describe('areHeadersValid', () => {
  it('returns true if the headers match the config', () => {
    const expected = {
      'x-hello': 'world',
      'what-is': 'love',
      baby: 'dont,hurt,me',
    }

    const result = areHeadersValid(expected, {
      'X-Hello': 'world',
      'what-is': 'love',
      baby: ['dont', 'hurt', 'me'],
    })

    expect(result).toMatchObject<HeaderValidationResult>({ success: true })
  })

  it('returns false if headers are missing', () => {
    const expected = {
      hello: 'world',
      'what-is': 'love',
      baby: 'dont,hurt,me',
    }

    const result = areHeadersValid(expected, {
      Hello: 'world',
      'what-is': 'Love',
      baby: ['dont', 'hurt', 'me'],
    })

    expect(result).toMatchObject<HeaderValidationResult>({
      success: false,
    })
  })

  it('returns false if header values do not match case', () => {
    const expected = {
      hello: 'world',
      'what-is': 'love',
      baby: 'dont,hurt,me',
    }

    const result = areHeadersValid(expected, {
      hello: 'world',
      'what-is': 'love',
      baby: ['dont', 'Hurt', 'me'],
    })

    expect(result).toMatchObject<HeaderValidationResult>({ success: false })
  })
})
