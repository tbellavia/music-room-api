import { QueryFailedError } from 'typeorm';
import { isUniqueViolation, violatedUniqueConstraint } from './error-utils';

type PostgresErrorFields = {
  code: string;
  constraint?: string;
};

// The pg driver throws an Error carrying the Postgres fields
function queryError(fields: PostgresErrorFields): QueryFailedError {
  const driverError = Object.assign(new Error('query failed'), fields);
  return new QueryFailedError('INSERT INTO accounts ...', [], driverError);
}

const emailUniqueViolation = queryError({
  code: '23505',
  constraint: 'UQ_accounts_email',
});

const foreignKeyViolation = queryError({
  code: '23503',
  constraint: 'FK_participants_playlist',
});

describe('isUniqueViolation', () => {
  it('detects a unique violation', () => {
    expect(isUniqueViolation(emailUniqueViolation)).toBe(true);
  });

  it('ignores another database error', () => {
    expect(isUniqueViolation(foreignKeyViolation)).toBe(false);
  });

  it('ignores an error that does not come from the database', () => {
    expect(isUniqueViolation(new Error('23505'))).toBe(false);
  });
});

describe('violatedUniqueConstraint', () => {
  it('returns the name of the violated constraint', () => {
    const constraint = violatedUniqueConstraint(emailUniqueViolation);

    expect(constraint).toBe('UQ_accounts_email');
  });

  it('returns null for another database error', () => {
    const constraint = violatedUniqueConstraint(foreignKeyViolation);

    expect(constraint).toBeNull();
  });

  it('returns null when the driver does not give the constraint', () => {
    const violationWithoutConstraint = queryError({ code: '23505' });

    const constraint = violatedUniqueConstraint(violationWithoutConstraint);

    expect(constraint).toBeNull();
  });
});
