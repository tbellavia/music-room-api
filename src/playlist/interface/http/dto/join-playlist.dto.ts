import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { withCode } from 'src/interface/http/validation/validation-code';

// Position of the caller: needed to join a VOTE playlist (a missing one counts
// as outside the zone), ignored for an EDITOR playlist
export class JoinPlaylistDto {
  @IsOptional()
  @IsNumber({}, withCode('LATITUDE_INVALID'))
  @Min(-90, withCode('LATITUDE_OUT_OF_RANGE'))
  @Max(90, withCode('LATITUDE_OUT_OF_RANGE'))
  latitude?: number;

  @IsOptional()
  @IsNumber({}, withCode('LONGITUDE_INVALID'))
  @Min(-180, withCode('LONGITUDE_OUT_OF_RANGE'))
  @Max(180, withCode('LONGITUDE_OUT_OF_RANGE'))
  longitude?: number;
}
