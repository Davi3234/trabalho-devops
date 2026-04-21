export class ApplicationException<T extends Record<string, any> = Record<string, any>> extends Error {

  readonly timestamp = new Date(Date.now())

  constructor(
    public readonly message: string,
    public readonly details: T | null = null
  ) {
    super(message)
  }
}
