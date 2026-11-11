import { IsString } from 'class-validator';
import { withCode } from 'src/interface/http/validation/validation-code';

export class SignInDto {
  @IsString(withCode('USERNAME_INVALID'))
  username: string;

  @IsString(withCode('PASSWORD_INVALID'))
  password: string;
}
