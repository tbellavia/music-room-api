import { QueryFailedError } from 'typeorm';

// https://www.postgresql.org/docs/current/errcodes-appendix.html
const POSTGRES_UNIQUE_VIOLATION = '23505';

export function isUniqueViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  // The driver error is untyped: check that it carries a Postgres code
  const driverError: unknown = error.driverError;
  if (typeof driverError !== 'object' || driverError === null) {
    return false;
  }
  if (!('code' in driverError)) {
    return false;
  }
  return driverError.code === POSTGRES_UNIQUE_VIOLATION;
}
