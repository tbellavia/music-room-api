import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { withCode } from 'src/interface/http/validation/validation-code';
import { USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from 'src/shared/constants';

const OTP_CODE_PATTERN = /^\d{6}$/;

export class VerifyDto {
  @IsString(withCode('USERNAME_INVALID'))
  @MaxLength(USERNAME_MAX_LENGTH, withCode('USERNAME_TOO_LONG'))
  @MinLength(USERNAME_MIN_LENGTH, withCode('USERNAME_TOO_SHORT'))
  username: string;

  @IsString(withCode('OTP_CODE_INVALID'))
  @Matches(OTP_CODE_PATTERN, withCode('OTP_CODE_INVALID'))
  otp_code: string;
}
