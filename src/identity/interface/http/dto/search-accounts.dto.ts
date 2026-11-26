import { IsOptional, IsString, MaxLength } from 'class-validator';
import { withCode } from 'src/interface/http/validation/validation-code';
import { USERNAME_MAX_LENGTH } from 'src/shared/constants';

export class SearchAccountsDto {
  @IsOptional()
  @IsString(withCode('PREFIX_INVALID'))
  // Longer than any username: it could never match
  @MaxLength(USERNAME_MAX_LENGTH, withCode('PREFIX_TOO_LONG'))
  prefix: string | null = null;
}
