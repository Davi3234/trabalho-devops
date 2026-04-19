export class ApplicationException extends Error {

  readonly timestamp = new Date(Date.now())

  constructor(
    public readonly message: string,
    public readonly details: Record<string, any> | null = null
  ) {
    super(message)
  }
}
