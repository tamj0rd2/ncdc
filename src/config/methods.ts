import * as yup from 'yup'

declare module 'yup' {
  interface ObjectSchema {
    allowedKeysOnly: (this: ObjectSchema) => ObjectSchema
  }
}

yup.addMethod(yup.object, 'allowedKeysOnly', function(this: yup.ObjectSchema) {
  return this.test('allowedKeysOnly', '${path} contains an unknown key', function(value) {
    if (!value) return true

    const known = Object.keys((this.schema as any).fields)
    const unknownKeys = Object.keys(value).filter(key => known.indexOf(key) === -1)

    if (!unknownKeys.length) return true
    return this.createError({
      path: this.path,
      message: `${this.path || 'this'} contains the unknown keys: ${unknownKeys.join(', ')}`,
    })
  })
})
