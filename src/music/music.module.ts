import { Module } from '@nestjs/common';
import { MusicController } from './interface/http/music.controller';
import { YOUTUBE_CLIENT_PORT } from './application/ports/youtube-client.port';
import { YoutubeApiClient } from './infrastructure/youtube-api.client';

@Module({
  controllers: [MusicController],
  providers: [
    {
      provide: YOUTUBE_CLIENT_PORT,
      useClass: YoutubeApiClient,
    }
  ]
})
export class MusicModule {}
