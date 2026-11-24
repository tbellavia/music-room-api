import { ParseUUIDPipe } from '@nestjs/common';
import { ValidationCode } from './validation-code';
import { RequestValidationFailed } from './request-validation-failed.error';

// Path parameters skip the DTOs: an id that is not a UUID would reach
// PostgreSQL, which rejects it, and end up as a 500.
// Usage: @Param('playlistId', uuidParam('PLAYLIST_ID_INVALID'))
export function uuidParam(code: ValidationCode): ParseUUIDPipe {
  return new ParseUUIDPipe({
    exceptionFactory: (message: string) =>
      new RequestValidationFailed(code, message),
  });
}
