import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlaylistController } from './interface/http/playlist.controller';
import { PlaylistOrmEntity } from './infrastructure/persistence/playlist/typeorm-playlist.entity';
import { ParticipantOrmEntity } from './infrastructure/persistence/participant/typeorm-participant.entity';
import { PLAYLIST_REPOSITORY } from './application/ports/playlist.repository';
import { TypeOrmPlaylistRepository } from './infrastructure/persistence/playlist/typeorm-playlist.repository';
import { PARTICIPANT_REPOSITORY } from './application/ports/participant.repository';
import { TypeOrmParticipantRepository } from './infrastructure/persistence/participant/typeorm-participant.repository';
import { CreatePlaylistUseCase } from './application/use-cases/create-playlist/create-playlist.usecase';
import { ListPublicPlaylistsUseCase } from './application/use-cases/list-public-playlists/list-public-playlists.usecase';
import { JoinPlaylistUseCase } from './application/use-cases/join-playlist/join-playlist.usecase';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlaylistOrmEntity, ParticipantOrmEntity]),
  ],
  controllers: [PlaylistController],
  providers: [
    {
      provide: PLAYLIST_REPOSITORY,
      useClass: TypeOrmPlaylistRepository,
    },
    {
      provide: PARTICIPANT_REPOSITORY,
      useClass: TypeOrmParticipantRepository,
    },
    CreatePlaylistUseCase,
    ListPublicPlaylistsUseCase,
    JoinPlaylistUseCase,
  ],
})
export class PlaylistModule {}
