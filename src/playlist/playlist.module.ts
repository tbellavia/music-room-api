import { Module } from '@nestjs/common';
import { PlaylistController } from './interface/http/playlist.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlaylistOrmEntity } from './infrastructure/persistence/playlist/typeorm-playlist.entity';
import { PlaylistParticipantOrmEntity } from './infrastructure/persistence/participants/typeorm-participant.entity';

@Module({
  imports: [

    TypeOrmModule.forFeature([PlaylistParticipantOrmEntity, PlaylistOrmEntity])
  ],
  controllers: [PlaylistController]
})
export class PlaylistModule {}
