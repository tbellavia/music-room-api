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
  ValidateIf,
} from 'class-validator';
import { PlaylistType } from 'src/playlist/domain/playlist-type.enum';
import { PlaylistLicense } from 'src/playlist/domain/playlist-license.enum';
import {
  PLAYLIST_DESCRIPTION_MAX_LENGTH,
  PLAYLIST_NAME_MAX_LENGTH,
  PLAYLIST_NAME_MIN_LENGTH,
} from 'src/shared/constants';
import { withCode } from 'src/interface/http/validation/validation-code';

// An invalid type is reported on `type`: the coordinates are then still
// checked, like for a VOTE playlist
function isVotePlaylist(dto: CreatePlaylistDto): boolean {
  return dto.type !== PlaylistType.EDITOR;
}

export class CreatePlaylistDto {
  @IsEnum(PlaylistType, withCode('PLAYLIST_TYPE_INVALID'))
  type: PlaylistType;

  @IsString(withCode('NAME_INVALID'))
  @MinLength(PLAYLIST_NAME_MIN_LENGTH, withCode('NAME_TOO_SHORT'))
  @MaxLength(PLAYLIST_NAME_MAX_LENGTH, withCode('NAME_TOO_LONG'))
  name: string;

  @IsString(withCode('DESCRIPTION_INVALID'))
  @MaxLength(PLAYLIST_DESCRIPTION_MAX_LENGTH, withCode('DESCRIPTION_TOO_LONG'))
  description: string;

  @IsOptional()
  @IsBoolean(withCode('IS_PRIVATE_INVALID'))
  isPrivate?: boolean;

  @IsOptional()
  @IsEnum(PlaylistLicense, withCode('LICENSE_INVALID'))
  license?: PlaylistLicense;

  @IsOptional()
  @Type(() => Date)
  @IsDate(withCode('BEGIN_AT_INVALID'))
  beginAt?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate(withCode('END_AT_INVALID'))
  endAt?: Date;

  // Validated for a VOTE playlist only. For an EDITOR playlist, the domain
  // rejects any value sent with LOCATION_NOT_ALLOWED.
  @ValidateIf(isVotePlaylist)
  @IsNumber({}, withCode('LATITUDE_INVALID'))
  @Min(-90, withCode('LATITUDE_OUT_OF_RANGE'))
  @Max(90, withCode('LATITUDE_OUT_OF_RANGE'))
  latitude?: number;

  @ValidateIf(isVotePlaylist)
  @IsNumber({}, withCode('LONGITUDE_INVALID'))
  @Min(-180, withCode('LONGITUDE_OUT_OF_RANGE'))
  @Max(180, withCode('LONGITUDE_OUT_OF_RANGE'))
  longitude?: number;
}
