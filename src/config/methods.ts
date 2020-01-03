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

declare module 'yup' {
  interface Schema<T> {
    requiredIfNoSiblings<V>(this: Schema<Optional<T>>, ...siblings: string[]): Schema<Optional<T>>

    notAllowedIfSiblings(this: Schema<Optional<T>>, ...siblings: string[]): Schema<Optional<T>>
  }

  interface ObjectSchema<T> {
    allowedKeysOnly(this: ObjectSchema<T>, ...ignoredKeys: string[]): ObjectSchema<T>
  }
}
