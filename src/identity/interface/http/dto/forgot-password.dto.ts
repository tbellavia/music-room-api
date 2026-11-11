import { IsEmail } from 'class-validator';
import { withCode } from 'src/interface/http/validation/validation-code';

export class ForgotPasswordDto {
  @IsEmail({}, withCode('EMAIL_INVALID'))
  email: string;
}
