import {
  IsString,
  IsStrongPassword,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { withCode } from 'src/interface/http/validation/validation-code';
import {
  PASSWORD_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from 'src/shared/constants';
import { STRONG_PASSWORD_OPTIONS } from './password-rules';

const OTP_CODE_PATTERN = /^\d{6}$/;

export class ResetPasswordDto {
  @IsString(withCode('USERNAME_INVALID'))
  @MaxLength(USERNAME_MAX_LENGTH, withCode('USERNAME_TOO_LONG'))
  @MinLength(USERNAME_MIN_LENGTH, withCode('USERNAME_TOO_SHORT'))
  username: string;

  @IsString(withCode('OTP_CODE_INVALID'))
  @Matches(OTP_CODE_PATTERN, withCode('OTP_CODE_INVALID'))
  otp_code: string;

  @IsString(withCode('NEW_PASSWORD_INVALID'))
  @IsStrongPassword(STRONG_PASSWORD_OPTIONS, withCode('NEW_PASSWORD_TOO_WEAK'))
  @MaxLength(PASSWORD_MAX_LENGTH, withCode('NEW_PASSWORD_TOO_LONG'))
  new_password: string;
}
