import { Body, Controller, Post } from '@nestjs/common';
import { UserIdParam } from 'src/interface/http/decorators/user-param.decorator';
import { CreatePlaylistUseCase } from 'src/playlist/application/use-cases/create-playlist/create-playlist.usecase';
import { CreatePlaylistDto } from './dto/create-playlist.dto';

@Controller('playlists')
export class PlaylistController {
  constructor(private readonly createPlaylist: CreatePlaylistUseCase) {}

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
}
