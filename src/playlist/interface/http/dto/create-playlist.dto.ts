import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PlaylistType } from 'src/playlist/domain/playlist-type.enum';
import {
  PLAYLIST_DESCRIPTION_MAX_LENGTH,
  PLAYLIST_NAME_MAX_LENGTH,
  PLAYLIST_NAME_MIN_LENGTH,
} from 'src/shared/constants';

export class CreatePlaylistDto {
  @IsEnum(PlaylistType)
  type: PlaylistType;

  @IsString()
  @MinLength(PLAYLIST_NAME_MIN_LENGTH)
  @MaxLength(PLAYLIST_NAME_MAX_LENGTH)
  name: string;

  @IsString()
  @MaxLength(PLAYLIST_DESCRIPTION_MAX_LENGTH)
  description: string;

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  beginAt?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endAt?: Date;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;
}
