import { QueryFailedError } from 'typeorm';

// https://www.postgresql.org/docs/current/errcodes-appendix.html
const POSTGRES_UNIQUE_VIOLATION = '23505';

// The driver error is untyped: only keep it when it is an object
function driverErrorOf(error: unknown): object | null {
  if (!(error instanceof QueryFailedError)) {
    return null;
  }
  const driverError: unknown = error.driverError;
  if (typeof driverError !== 'object' || driverError === null) {
    return null;
  }
  return driverError;
}

export function isUniqueViolation(error: unknown): boolean {
  const driverError = driverErrorOf(error);
  if (driverError === null || !('code' in driverError)) {
    return false;
  }
  return driverError.code === POSTGRES_UNIQUE_VIOLATION;
}

// Name of the unique constraint that was violated, null for any other error
export function violatedUniqueConstraint(error: unknown): string | null {
  if (!isUniqueViolation(error)) {
    return null;
  }
  const driverError = driverErrorOf(error);
  if (driverError === null || !('constraint' in driverError)) {
    return null;
  }
  const constraint = driverError.constraint;
  if (typeof constraint !== 'string') {
    return null;
  }
  return constraint;
}
