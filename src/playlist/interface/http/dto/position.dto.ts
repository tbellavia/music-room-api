import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { Coordinates } from 'src/playlist/domain/geo';

// Position of the caller, required for participants acting on the tracks.
// Used in bodies and in query strings, hence the conversion to number.
export class PositionDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
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
