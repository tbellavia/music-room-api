import { IsInt, IsUUID, Min, ValidateIf } from 'class-validator';
import { withCode } from 'src/interface/http/validation/validation-code';

export class MoveTrackDto {
  // Required: a track id, or null to place the track first
  @ValidateIf((dto: MoveTrackDto) => dto.afterTrackId !== null)
  @IsUUID(undefined, withCode('AFTER_TRACK_ID_INVALID'))
  afterTrackId: string | null;

  @IsInt(withCode('VERSION_INVALID'))
  @Min(1, withCode('VERSION_INVALID'))
  version: number;
}
