import { IsString, MaxLength, MinLength } from 'class-validator';
import { withCode } from 'src/interface/http/validation/validation-code';
import { USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from 'src/shared/constants';

export class ForgotPasswordDto {
  @IsString(withCode('USERNAME_INVALID'))
  @MaxLength(USERNAME_MAX_LENGTH, withCode('USERNAME_TOO_LONG'))
  @MinLength(USERNAME_MIN_LENGTH, withCode('USERNAME_TOO_SHORT'))
  username: string;
}
