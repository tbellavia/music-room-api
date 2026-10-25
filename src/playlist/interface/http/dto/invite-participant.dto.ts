import { IsUUID } from 'class-validator';

export class InviteParticipantDto {
  @IsUUID()
  accountId: string;
}
