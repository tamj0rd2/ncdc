import * as yup from 'yup'

yup.addMethod(yup.mixed, 'requiredIfNoSiblings', function(
  this: yup.Schema<yup.MixedSchema>,
  ...siblings: string[]
) {
  return this.test('requiredIf', '', function(value) {
    const allSiblingsDefined = siblings.filter(x => !this.parent[x]).length === 0

    const isValid = allSiblingsDefined || !!value

    return (
      isValid ||
      this.createError({
        path: this.path,
        message: `${this.path} is required because the following siblings are not defined: ${siblings.join(
          ', ',
        )}`,
      })
    )
  })
})

yup.addMethod(yup.mixed, 'notAllowedIfSiblings', function(
  this: yup.Schema<yup.MixedSchema>,
  ...siblings: string[]
) {
  return this.test('notAllowedIf', '', function(value) {
    if (!value) return true

    const siblingIsDefined = siblings.find(x => !!this.parent[x])
    if (!siblingIsDefined) return true

    return this.createError({
      path: this.path,
      message: `${
        this.path
      } is not allowed because one of the following siblings are defined: ${siblings.join(', ')}`,
    })
  })
})

yup.addMethod(yup.object, 'allowedKeysOnly', function(...ignoredKeys: string[]) {
  return this.test('allowedKeysOnly', '', function(value) {
    if (!value) return true

    const known = Object.keys((this.schema as any).fields).concat(ignoredKeys)
    const unknownKeys = Object.keys(value).filter(key => known.indexOf(key) === -1)

    if (!unknownKeys.length) return true
    return this.createError({
      path: this.path,
      message: `${this.path || 'object'} contains the unknown keys: ${unknownKeys.join(', ')}`,
    })
  })
})

yup.addMethod(yup.string, 'startsWith', function(substring: string) {
  return this.test(
    'startsWith',
    `value of \${path} should start with ${substring} but received \${value} `,
    function(value) {
      return !value || value.startsWith(substring)

      return this.createError({
        path: this.path,
        message: `${this.path} value should start with "${substring}" but the value was: ${value}}`,
      })
    },
  )
})

type NotAllowedIfSiblings<T> = (this: T, ...siblings: string[]) => typeof this

declare module 'yup' {
  interface MixedSchema<T> {
    notAllowedIfSiblings: (this: MixedSchema<T>, ...siblings: string[]) => MixedSchema<Optional<T>>
  }

  interface ArraySchema<T> {
    requiredIfNoSiblings<V>(this: ArraySchema<T>, ...siblings: string[]): NotRequiredArraySchema<T>
  }

  interface ObjectSchema<T> {
    allowedKeysOnly(this: ObjectSchema<T>, ...ignoredKeys: string[]): typeof this
  }

  interface StringSchema<T> {
    startsWith(this: StringSchema<T>, substring: string): typeof this
    notAllowedIfSiblings: (this: StringSchema<T>, ...siblings: string[]) => StringSchema<Optional<T>>
    requiredIfNoSiblings<V>(this: StringSchema<T>, ...siblings: string[]): StringSchema<Optional<T>>
  }
}
