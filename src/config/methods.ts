import * as yup from 'yup'

yup.addMethod(yup.mixed, 'requiredIf', function requiredIf<V>(
  this: yup.Schema<yup.MixedSchema>,
  sibling: string,
  condition: (value: V) => boolean,
) {
  return this.test('requiredIf', '', function (value) {
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

yup.addMethod(yup.mixed, 'notAllowedIf', function requiredIf(
  this: yup.Schema<yup.MixedSchema>,
  sibling: string | string[],
  condition: (siblingValue: any) => boolean,
) {
  return this.test('notAllowedIf', '', function (value) {
    const siblings = typeof sibling === 'string' ? [sibling] : sibling
    if (!value) return true

    const conflict = siblings.map(sibling => condition(this.parent[sibling])).find(x => x)
    if (!conflict) return true

    return this.createError({
      path: this.path,
      message: `${this.path} is not allowed because one of the following siblings are defined: ${siblings.join(', ')}`,
    })
  })
})

yup.addMethod(yup.object, 'allowedKeysOnly', function allowedKeysOnly(...ignoredKeys: string[]) {
  return this.test('allowedKeysOnly', '', function (value) {
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

    notAllowedIf(
      this: Schema<Optional<T>>,
      sibling: string | string[],
      condition: (siblingValue: any) => boolean,
    ): Schema<Optional<T>>
  }

  interface ObjectSchema<T> {
    allowedKeysOnly(this: ObjectSchema<T>, ...ignoredKeys: string[]): ObjectSchema<T>
  }
}
