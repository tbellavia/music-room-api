import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { UserIdParam } from 'src/interface/http/decorators/user-param.decorator';
import { CreatePlaylistUseCase } from 'src/playlist/application/use-cases/create-playlist/create-playlist.usecase';
import { ListPublicPlaylistsUseCase } from 'src/playlist/application/use-cases/list-public-playlists/list-public-playlists.usecase';
import { JoinPlaylistUseCase } from 'src/playlist/application/use-cases/join-playlist/join-playlist.usecase';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { JoinPlaylistDto } from './dto/join-playlist.dto';

@Controller('playlists')
export class PlaylistController {
  constructor(
    private readonly createPlaylist: CreatePlaylistUseCase,
    private readonly listPublicPlaylists: ListPublicPlaylistsUseCase,
    private readonly joinPlaylist: JoinPlaylistUseCase,
  ) {}

  @Post()
  async create(
    @UserIdParam() ownerId: string,
    @Body() createPlaylistDto: CreatePlaylistDto,
  ) {
    return await this.createPlaylist.execute({
      ownerId,
      type: createPlaylistDto.type,
      name: createPlaylistDto.name,
      description: createPlaylistDto.description,
      isPrivate: createPlaylistDto.isPrivate,
      beginAt: createPlaylistDto.beginAt,
      endAt: createPlaylistDto.endAt,
      latitude: createPlaylistDto.latitude,
      longitude: createPlaylistDto.longitude,
    });
  }

  @Get('public')
  async listPublic() {
    return await this.listPublicPlaylists.execute();
  }

  @Post(':playlistId/join')
  async join(
    @UserIdParam() accountId: string,
    @Param('playlistId') playlistId: string,
    @Body() joinPlaylistDto: JoinPlaylistDto,
  ) {
    return await this.joinPlaylist.execute({
      playlistId,
      accountId,
      latitude: joinPlaylistDto.latitude,
      longitude: joinPlaylistDto.longitude,
    });
  }
}
