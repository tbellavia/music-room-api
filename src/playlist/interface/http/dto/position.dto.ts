import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { Coordinates } from 'src/playlist/domain/geo';
import { withCode } from 'src/interface/http/validation/validation-code';

// Position of the caller, required for participants acting on the tracks.
// Used in bodies and in query strings, hence the conversion to number.
export class PositionDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, withCode('LATITUDE_INVALID'))
  @Min(-90, withCode('LATITUDE_OUT_OF_RANGE'))
  @Max(90, withCode('LATITUDE_OUT_OF_RANGE'))
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, withCode('LONGITUDE_INVALID'))
  @Min(-180, withCode('LONGITUDE_OUT_OF_RANGE'))
  @Max(180, withCode('LONGITUDE_OUT_OF_RANGE'))
  longitude?: number;
}

// Both coordinates are needed to locate the caller, otherwise there is no position
export function toPosition(dto: PositionDto): Coordinates | null {
  if (dto.latitude === undefined || dto.longitude === undefined) {
    return null;
  }
  return {
    latitude: dto.latitude,
    longitude: dto.longitude,
  };
}
