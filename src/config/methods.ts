import * as yup from 'yup'

function requiredIf<T, V>(
  this: yup.Schema<T>,
  sibling: string,
  isSiblingValid: (value: V) => boolean,
): yup.Schema<T> {
  return this.test('requiredIf', 'BAD THINGS', function(value) {
    return !isSiblingValid(this.parent[sibling]) || !!value
  })
}

yup.addMethod(yup.mixed, 'requiredIf', requiredIf)

yup.addMethod(yup.object, 'allowedKeysOnly', function allowedKeysOnly(...excludedKeys: string[]) {
  return this.test('allowedKeysOnly', '${path} contains an unknown key', function(value) {
    if (!value) return true

    const known = Object.keys((this.schema as any).fields).concat(excludedKeys)
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
    requiredIf: typeof requiredIf
  }

  interface ObjectSchema<T> {
    allowedKeysOnly(this: ObjectSchema<T>, ...excludedKeys: string[]): ObjectSchema<T>
  }
}
