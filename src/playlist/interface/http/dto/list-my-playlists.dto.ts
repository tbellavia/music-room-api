import { IsEnum, IsOptional } from 'class-validator';
import { withCode } from 'src/interface/http/validation/validation-code';
import { PlaylistRole } from 'src/playlist/domain/playlist-role.enum';
import { PlaylistStatus } from 'src/playlist/domain/playlist-status.enum';
import { SortOrder } from 'src/playlist/application/use-cases/list-my-playlists/list-my-playlists.contracts';

// Query string of GET /playlists/me
export class ListMyPlaylistsDto {
  @IsOptional()
  @IsEnum(PlaylistRole, withCode('ROLE_INVALID'))
  role?: PlaylistRole;

  @IsOptional()
  @IsEnum(PlaylistStatus, withCode('STATUS_INVALID'))
  status?: PlaylistStatus;

  @IsOptional()
  @IsEnum(SortOrder, withCode('ORDER_INVALID'))
  order?: SortOrder;
}
