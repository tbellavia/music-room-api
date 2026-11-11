import {
  IsEmail,
  IsString,
  IsStrongPassword,
  MaxLength,
  MinLength,
} from 'class-validator';
import { withCode } from 'src/interface/http/validation/validation-code';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from 'src/shared/constants';

export class RegisterAccountDto {
  @IsString(withCode('USERNAME_INVALID'))
  @MaxLength(USERNAME_MAX_LENGTH, withCode('USERNAME_TOO_LONG'))
  @MinLength(USERNAME_MIN_LENGTH, withCode('USERNAME_TOO_SHORT'))
  username: string;

  @IsEmail({}, withCode('EMAIL_INVALID'))
  email: string;

  @IsString(withCode('PASSWORD_INVALID'))
  @IsStrongPassword(
    {
      minLength: PASSWORD_MIN_LENGTH,
      minSymbols: 1,
      minUppercase: 1,
      minLowercase: 1,
      minNumbers: 1,
    },
    withCode('PASSWORD_TOO_WEAK'),
  )
  @MaxLength(PASSWORD_MAX_LENGTH, withCode('PASSWORD_TOO_LONG'))
  password: string;
}
