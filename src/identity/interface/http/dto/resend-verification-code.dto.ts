import { IsString, MaxLength, MinLength } from 'class-validator';
import { USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from 'src/shared/constants';

export class ResendVerificationCodeDto {
  @IsString()
  @MaxLength(USERNAME_MAX_LENGTH)
  @MinLength(USERNAME_MIN_LENGTH)
  username: string;
}
