import { Type } from 'class-transformer';
import { IsNumber, Max, Min, ValidateIf } from 'class-validator';
import { withCode } from 'src/interface/http/validation/validation-code';

function hasAnyCoordinate(dto: ListPublicEventsDto): boolean {
  return dto.latitude !== undefined || dto.longitude !== undefined;
}

// Query string of GET /playlists/events. The position is optional, but a
// single coordinate is refused rather than silently ignored.
export class ListPublicEventsDto {
  @ValidateIf(hasAnyCoordinate)
  @Type(() => Number)
  @IsNumber({}, withCode('LATITUDE_INVALID'))
  @Min(-90, withCode('LATITUDE_OUT_OF_RANGE'))
  @Max(90, withCode('LATITUDE_OUT_OF_RANGE'))
  latitude?: number;

  @ValidateIf(hasAnyCoordinate)
  @Type(() => Number)
  @IsNumber({}, withCode('LONGITUDE_INVALID'))
  @Min(-180, withCode('LONGITUDE_OUT_OF_RANGE'))
  @Max(180, withCode('LONGITUDE_OUT_OF_RANGE'))
  longitude?: number;
}
