export class Type {
  public constructor(private readonly type: string) {}

  public get(): string {
    return this.type
  }
}
