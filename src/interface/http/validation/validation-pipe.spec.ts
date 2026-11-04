import { ArgumentMetadata, ValidationError } from '@nestjs/common';
import { RegisterAccountDto } from 'src/identity/interface/http/dto/register-account.dto';
import { RequestValidationFailed } from './request-validation-failed.error';
import {
  createValidationPipe,
  firstValidationMessage,
} from './validation-pipe';

const registerBodyMetadata: ArgumentMetadata = {
  type: 'body',
  metatype: RegisterAccountDto,
};

const validRegisterBody = {
  username: 'alice',
  email: 'alice@example.com',
  password: 'Password123!x',
};

async function validationErrorOf(body: object): Promise<unknown> {
  const pipe = createValidationPipe();
  try {
    await pipe.transform(body, registerBodyMetadata);
  } catch (error) {
    return error;
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

    const error = await validationErrorOf(invalidBody);

    expect(error).toBeInstanceOf(RequestValidationFailed);
    expect(error).toHaveProperty(
      'message',
      'username must be longer than or equal to 3 characters',
    );
  });

  it('reports the next invalid field once the first one is fixed', async () => {
    const bodyWithInvalidEmail = {
      ...validRegisterBody,
      email: 'not-an-email',
      password: 'weak',
    };

    const error = await validationErrorOf(bodyWithInvalidEmail);

    expect(error).toHaveProperty('message', 'email must be an email');
  });

  it('rejects an unknown field', async () => {
    const bodyWithUnknownField = { ...validRegisterBody, isAdmin: true };

    const error = await validationErrorOf(bodyWithUnknownField);

    expect(error).toHaveProperty(
      'message',
      'property isAdmin should not exist',
    );
  });
});

describe('firstValidationMessage', () => {
  it('looks into nested errors', () => {
    const nestedError: ValidationError = {
      property: 'latitude',
      constraints: { max: 'latitude must not be greater than 90' },
    };
    const parentError: ValidationError = {
      property: 'position',
      children: [nestedError],
    };

    const message = firstValidationMessage([parentError]);

    expect(message).toBe('latitude must not be greater than 90');
  });

  it('falls back to a generic message when no constraint is given', () => {
    const message = firstValidationMessage([]);

    expect(message).toBe('Invalid request');
  });
});
