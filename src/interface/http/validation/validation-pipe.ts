import { ValidationError, ValidationPipe } from '@nestjs/common';
import { RequestValidationFailed } from './request-validation-failed.error';

// Used when a decorator has no code attached (see withCode)
export const FALLBACK_VALIDATION_CODE = 'VALIDATION_FAILED';
const FALLBACK_MESSAGE = 'Invalid request';

// Sent for a field that the DTO does not declare (forbidNonWhitelisted)
const UNKNOWN_FIELD_CONSTRAINT = 'whitelistValidation';
const UNKNOWN_FIELD_CODE = 'UNKNOWN_FIELD';

export type ValidationViolation = {
  code: string;
  message: string;
};

function codeOf(error: ValidationError, constraint: string): string {
  if (constraint === UNKNOWN_FIELD_CONSTRAINT) {
    return UNKNOWN_FIELD_CODE;
  }
  const context: unknown = error.contexts?.[constraint];
  if (typeof context !== 'object' || context === null) {
    return FALLBACK_VALIDATION_CODE;
  }
  if (!('code' in context) || typeof context.code !== 'string') {
    return FALLBACK_VALIDATION_CODE;
  }
  return context.code;
}

function findFirstViolation(
  errors: ValidationError[],
): ValidationViolation | null {
  for (const error of errors) {
    // class-validator lists the constraints in reverse order of the decorators:
    // the last one is the first written in the DTO, usually the type check
    const constraints = Object.keys(error.constraints ?? {});
    if (constraints.length > 0) {
      const constraint = constraints[constraints.length - 1];
      const message = error.constraints?.[constraint] ?? FALLBACK_MESSAGE;
      return { code: codeOf(error, constraint), message };
    }
    const childViolation = findFirstViolation(error.children ?? []);
    if (childViolation !== null) {
      return childViolation;
    }
  }
  return null;
}

// The client gets one violation at a time: once fixed, the next request reports the next one
export function firstValidationViolation(
  errors: ValidationError[],
): ValidationViolation {
  const violation = findFirstViolation(errors);
  if (violation === null) {
    return { code: FALLBACK_VALIDATION_CODE, message: FALLBACK_MESSAGE };
  }
  return violation;
}

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors: ValidationError[]) => {
      const violation = firstValidationViolation(errors);
      return new RequestValidationFailed(violation.code, violation.message);
    },
  });
}
