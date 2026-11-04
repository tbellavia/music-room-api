import { ValidationError, ValidationPipe } from '@nestjs/common';
import { RequestValidationFailed } from './request-validation-failed.error';

const FALLBACK_MESSAGE = 'Invalid request';

function findFirstMessage(errors: ValidationError[]): string | null {
  for (const error of errors) {
    // class-validator lists the constraints in reverse order of the decorators:
    // the last one is the first written in the DTO, usually the type check
    const messages = Object.values(error.constraints ?? {});
    if (messages.length > 0) {
      return messages[messages.length - 1];
    }
    const childMessage = findFirstMessage(error.children ?? []);
    if (childMessage !== null) {
      return childMessage;
    }
  }
  return null;
}

// The client gets one message at a time: once fixed, the next request reports the next one
export function firstValidationMessage(errors: ValidationError[]): string {
  const message = findFirstMessage(errors);
  return message ?? FALLBACK_MESSAGE;
}

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors: ValidationError[]) => {
      const message = firstValidationMessage(errors);
      return new RequestValidationFailed(message);
    },
  });
}
