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
      baby: ['dont', 'me', 'hurt'],
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
      'what-is': 'love',
      baby: ['dont', 'hurt'],
    })

    expect(result).toMatchObject<HeaderValidationResult>({
      success: false,
    })
  })

  it('returns false if there are multiple received header values that do not match', () => {
    const expected = {
      hello: 'world',
    }

    const result = areHeadersValid(expected, {
      hello: ['werld', 'peace'],
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

  describe('when an expected header is a comma separated value', () => {
    it('returns false when only a single header value is sent', () => {
      const expected = {
        goodbye: 'cruel,world',
      }

      const result = areHeadersValid(expected, {
        goodbye: 'cruel',
      })

      expect(result).toMatchObject<HeaderValidationResult>({ success: false })
    })

    it('returns false when they do not match', () => {
      const expected = {
        goodbye: 'cruel,world',
      }

      const result = areHeadersValid(expected, {
        goodbye: ['cruel', 'orld'],
      })

      expect(result).toMatchObject<HeaderValidationResult>({ success: false })
    })
  })

  describe('when expected is a single value', () => {
    it('returns true when actual is an array that contains the correct value', () => {
      const expected = {
        hello: 'world',
      }

      const result = areHeadersValid(expected, {
        hello: ['sweet', 'world'],
      })

      expect(result).toMatchObject<HeaderValidationResult>({ success: true })
    })

    it('returns true when actual is an array that does not contain the correct value', () => {
      const expected = {
        hello: 'world',
      }

      const result = areHeadersValid(expected, {
        hello: ['sweet', 'gold'],
      })

      expect(result).toMatchObject<HeaderValidationResult>({ success: false })
    })
  })
})
