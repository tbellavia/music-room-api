import { IsInt, IsUUID, Min, ValidateIf } from 'class-validator';

export class MoveTrackDto {
  // Required: a track id, or null to place the track first
  @ValidateIf((dto: MoveTrackDto) => dto.afterTrackId !== null)
  @IsUUID()
  afterTrackId: string | null;

  @IsInt()
  @Min(1)
  version: number;
}
