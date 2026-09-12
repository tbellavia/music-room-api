import { Module } from '@nestjs/common';
import { PlaylistController } from './interface/http/playlist.controller';

@Module({
  controllers: [PlaylistController]
})
export class PlaylistModule {}
