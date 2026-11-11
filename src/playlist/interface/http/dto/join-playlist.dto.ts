import { IsNumber, Max, Min } from 'class-validator';
import { withCode } from 'src/interface/http/validation/validation-code';

export class JoinPlaylistDto {
  @IsNumber({}, withCode('LATITUDE_INVALID'))
  @Min(-90, withCode('LATITUDE_OUT_OF_RANGE'))
  @Max(90, withCode('LATITUDE_OUT_OF_RANGE'))
  latitude: number;

  @IsNumber({}, withCode('LONGITUDE_INVALID'))
  @Min(-180, withCode('LONGITUDE_OUT_OF_RANGE'))
  @Max(180, withCode('LONGITUDE_OUT_OF_RANGE'))
  longitude: number;
}
