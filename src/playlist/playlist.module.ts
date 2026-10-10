import { Module } from '@nestjs/common';
import { PlaylistController } from './interface/http/playlist.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParticipantsOrmEntity } from './infrastructure/participants/typeorm-participants.entity';
import { TrackVoteOrmEntity } from './infrastructure/track-vote/typeorm-track-vote.entity';
import { TrackEditorPlaylistOrmEntity } from './infrastructure/track-editor-playlist/typeorm-track-editor-playlist.entity';
import { TrackVotePlaylistOrmEntity } from './infrastructure/track-vote-playlist/typeorm-track-vote-playlist.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ParticipantsOrmEntity,
      TrackVoteOrmEntity,
      TrackEditorPlaylistOrmEntity,
      TrackVotePlaylistOrmEntity,
    ]),
  ],
  controllers: [PlaylistController],
})
export class PlaylistModule {}
