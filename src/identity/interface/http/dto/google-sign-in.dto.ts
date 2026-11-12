import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { withCode } from 'src/interface/http/validation/validation-code';

// A Google ID token is about 1 KB: the limit only rejects absurd bodies
const ID_TOKEN_MAX_LENGTH = 4096;

export class GoogleSignInDto {
  @IsString(withCode('ID_TOKEN_INVALID'))
  @IsNotEmpty(withCode('ID_TOKEN_INVALID'))
  @MaxLength(ID_TOKEN_MAX_LENGTH, withCode('ID_TOKEN_INVALID'))
  id_token: string;
}
