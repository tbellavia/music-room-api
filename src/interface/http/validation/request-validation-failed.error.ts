// Raised by the ValidationPipe, carries the first broken constraint only
export class RequestValidationFailed extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
