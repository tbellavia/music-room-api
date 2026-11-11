import { ArgumentMetadata, ValidationError } from '@nestjs/common';
import { RegisterAccountDto } from 'src/identity/interface/http/dto/register-account.dto';
import { PositionDto } from 'src/playlist/interface/http/dto/position.dto';
import { RequestValidationFailed } from './request-validation-failed.error';
import {
  createValidationPipe,
  firstValidationViolation,
} from './validation-pipe';

const registerBodyMetadata: ArgumentMetadata = {
  type: 'body',
  metatype: RegisterAccountDto,
};

const positionQueryMetadata: ArgumentMetadata = {
  type: 'query',
  metatype: PositionDto,
};

const validRegisterBody = {
  username: 'alice',
  email: 'alice@example.com',
  password: 'Password123!x',
};

async function rejectionOf(
  body: object,
  metadata: ArgumentMetadata = registerBodyMetadata,
): Promise<RequestValidationFailed> {
  const pipe = createValidationPipe();
  try {
    await pipe.transform(body, metadata);
  } catch (error) {
    if (error instanceof RequestValidationFailed) {
      return error;
    }
    throw error;
  }
  throw new Error('Expected the body to be rejected');
}

describe('createValidationPipe', () => {
  it('accepts a valid body', async () => {
    const pipe = createValidationPipe();

    const result: unknown = await pipe.transform(
      validRegisterBody,
      registerBodyMetadata,
    );

    expect(result).toBeInstanceOf(RegisterAccountDto);
  });

  it('reports only the first invalid field when several are invalid', async () => {
    const invalidBody = {
      username: 'ab',
      email: 'not-an-email',
      password: 'weak',
    };

    const rejection = await rejectionOf(invalidBody);

    expect(rejection.code).toBe('USERNAME_TOO_SHORT');
    expect(rejection.message).toBe(
      'username must be longer than or equal to 3 characters',
    );
  });

  it('reports the next invalid field once the first one is fixed', async () => {
    const bodyWithInvalidEmail = {
      ...validRegisterBody,
      email: 'not-an-email',
      password: 'weak',
    };

    const rejection = await rejectionOf(bodyWithInvalidEmail);

    expect(rejection.code).toBe('EMAIL_INVALID');
    expect(rejection.message).toBe('email must be an email');
  });

  it('reports the type of a field before its other constraints', async () => {
    const bodyWithNumericUsername = { ...validRegisterBody, username: 42 };

    const rejection = await rejectionOf(bodyWithNumericUsername);

    expect(rejection.code).toBe('USERNAME_INVALID');
    expect(rejection.message).toBe('username must be a string');
  });

  it('reports a missing field with the code of its type check', async () => {
    const bodyWithoutPassword = {
      username: 'alice',
      email: 'alice@example.com',
    };

    const rejection = await rejectionOf(bodyWithoutPassword);

    expect(rejection.code).toBe('PASSWORD_INVALID');
  });

  it('reports the constraint that actually fails when the type is right', async () => {
    const bodyWithLongUsername = {
      ...validRegisterBody,
      username: 'a'.repeat(21),
    };

    const rejection = await rejectionOf(bodyWithLongUsername);

    expect(rejection.code).toBe('USERNAME_TOO_LONG');
  });

  it('reports a weak password', async () => {
    const bodyWithWeakPassword = { ...validRegisterBody, password: 'weak' };

    const rejection = await rejectionOf(bodyWithWeakPassword);

    expect(rejection.code).toBe('PASSWORD_TOO_WEAK');
  });

  it('reports a position given in the query string', async () => {
    const outOfRangeQuery = { latitude: '200', longitude: '2.3' };

    const rejection = await rejectionOf(outOfRangeQuery, positionQueryMetadata);

    expect(rejection.code).toBe('LATITUDE_OUT_OF_RANGE');
  });

  it('reports a non numeric position before its range', async () => {
    const nonNumericQuery = { latitude: 'abc' };

    const rejection = await rejectionOf(nonNumericQuery, positionQueryMetadata);

    expect(rejection.code).toBe('LATITUDE_INVALID');
  });

  it('rejects an unknown field', async () => {
    const bodyWithUnknownField = { ...validRegisterBody, isAdmin: true };

    const rejection = await rejectionOf(bodyWithUnknownField);

    expect(rejection.code).toBe('UNKNOWN_FIELD');
    expect(rejection.message).toBe('property isAdmin should not exist');
  });
});

describe('firstValidationViolation', () => {
  it('looks into nested errors', () => {
    const nestedError: ValidationError = {
      property: 'latitude',
      constraints: { max: 'latitude must not be greater than 90' },
      contexts: { max: { code: 'LATITUDE_OUT_OF_RANGE' } },
    };
    const parentError: ValidationError = {
      property: 'position',
      children: [nestedError],
    };

    const violation = firstValidationViolation([parentError]);

    expect(violation).toEqual({
      code: 'LATITUDE_OUT_OF_RANGE',
      message: 'latitude must not be greater than 90',
    });
  });

  it('falls back to VALIDATION_FAILED when the decorator has no code', () => {
    const errorWithoutCode: ValidationError = {
      property: 'name',
      constraints: { isString: 'name must be a string' },
    };

    const violation = firstValidationViolation([errorWithoutCode]);

    expect(violation).toEqual({
      code: 'VALIDATION_FAILED',
      message: 'name must be a string',
    });
  });

  it('falls back to a generic violation when no constraint is given', () => {
    const violation = firstValidationViolation([]);

    expect(violation).toEqual({
      code: 'VALIDATION_FAILED',
      message: 'Invalid request',
    });
  });
});
