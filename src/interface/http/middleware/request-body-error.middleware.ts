import { NextFunction, Request, Response } from 'express';
import { InvalidJsonBody } from 'src/interface/http/errors/invalid-json-body.error';
import { RequestBodyTooLarge } from 'src/interface/http/errors/request-body-too-large.error';

// Set by body-parser on the errors it raises
const INVALID_JSON_TYPE = 'entity.parse.failed';
const TOO_LARGE_TYPE = 'entity.too.large';

function bodyParserErrorType(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }
  if (!('type' in error) || typeof error.type !== 'string') {
    return null;
  }
  return error.type;
}

// Registered right after the JSON parser. Without it, Nest turns an invalid
// JSON into a bare 400 with the parser message, and a too large body into a 500.
// The translated error goes on to the exception filter.
export function translateRequestBodyError(
  error: unknown,
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const type = bodyParserErrorType(error);
  if (type === INVALID_JSON_TYPE) {
    next(new InvalidJsonBody());
    return;
  }
  if (type === TOO_LARGE_TYPE) {
    next(new RequestBodyTooLarge());
    return;
  }
  next(error);
}
