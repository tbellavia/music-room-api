import { IsBoolean } from 'class-validator';
import { withCode } from 'src/interface/http/validation/validation-code';

export class UpdateParticipantPrivilegeDto {
  @IsBoolean(withCode('HAS_PRIVILEGE_INVALID'))
  hasPrivilege: boolean;
}
