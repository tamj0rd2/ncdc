import * as yup from 'yup'

yup.addMethod(yup.mixed, 'requiredIf', function requiredIf<V>(
  this: yup.Schema<yup.MixedSchema>,
  sibling: string,
  condition: (value: V) => boolean,
) {
  return this.test('requiredIf', '', function(value) {
    const isValid = !condition(this.parent[sibling]) || !!value

    return (
      isValid ||
      this.createError({
        path: this.path,
        message: `${this.path} is required because its sibling "${sibling}" is not defined`,
      })
    )
  })
})

yup.addMethod(yup.mixed, 'notAllowedIf', function requiredIf<V>(
  this: yup.Schema<yup.MixedSchema>,
  sibling: string,
  condition: (value: V) => boolean,
) {
  return this.test('notAllowedIf', '', function(value) {
    if (!value) return true

    const isAllowed = !condition(this.parent[sibling])
    if (isAllowed) return true

    return this.createError({
      path: this.path,
      message: `${this.path} is not allowed because its sibling "${sibling}" is defined`,
    })
  })
})

yup.addMethod(yup.object, 'allowedKeysOnly', function allowedKeysOnly(...ignoredKeys: string[]) {
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
    requiredIf<V>(
      this: Schema<Optional<T>>,
      sibling: string,
      condition: (siblingValue: V) => boolean,
    ): Schema<Optional<T>>

    notAllowedIf<V>(
      this: Schema<Optional<T>>,
      sibling: string,
      condition: (siblingValue: V) => boolean,
    ): Schema<Optional<T>>
  }

  interface ObjectSchema<T> {
    allowedKeysOnly(this: ObjectSchema<T>, ...ignoredKeys: string[]): ObjectSchema<T>
  }
}
