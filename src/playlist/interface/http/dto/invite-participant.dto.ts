import { IsUUID } from 'class-validator';
import { withCode } from 'src/interface/http/validation/validation-code';

export class InviteParticipantDto {
  @IsUUID(undefined, withCode('ACCOUNT_ID_INVALID'))
  accountId: string;
}
