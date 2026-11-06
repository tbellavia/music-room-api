import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from 'src/shared/constants';

export class VerifyDto {
  @IsString()
  @MaxLength(USERNAME_MAX_LENGTH)
  @MinLength(USERNAME_MIN_LENGTH)
  username: string;

  @IsString()
  @Matches('^\\d{6}$')
  otp_code: string;
}
