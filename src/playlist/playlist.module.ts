import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlaylistController } from './interface/http/playlist.controller';
import { PlaylistOrmEntity } from './infrastructure/persistence/playlist/typeorm-playlist.entity';
import { ParticipantOrmEntity } from './infrastructure/persistence/participant/typeorm-participant.entity';
import { PLAYLIST_REPOSITORY } from './application/ports/playlist.repository';
import { TypeOrmPlaylistRepository } from './infrastructure/persistence/playlist/typeorm-playlist.repository';
import { CreatePlaylistUseCase } from './application/use-cases/create-playlist/create-playlist.usecase';

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
    CreatePlaylistUseCase,
  ],
})
export class PlaylistModule {}
