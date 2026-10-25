import { IsBoolean } from 'class-validator';

export class UpdateParticipantPrivilegeDto {
  @IsBoolean()
  hasPrivilege: boolean;
}
