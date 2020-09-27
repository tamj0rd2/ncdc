import { randomString } from '~test-helpers'
import { Type } from './type'

export class TypeBuilder {
  private type = randomString('type')

  public static random(): Type {
    return new TypeBuilder().build()
  }

  public withType(type: string | number): TypeBuilder {
    this.type = type.toString()
    return this
  }

  public build(): Type {
    return new Type(this.type)
  }
}
