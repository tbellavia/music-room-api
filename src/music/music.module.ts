import { Module } from '@nestjs/common';
import { MusicController } from './interface/http/music.controller';
import { YOUTUBE_CLIENT_PORT } from './application/ports/youtube-client.port';
import { YoutubeApiClient } from './infrastructure/youtube-api.client';
import { SearchMusicUseCase } from './application/use-cases/search-music/search-music.usecase';

@Module({
  controllers: [MusicController],
  providers: [
    {
      provide: YOUTUBE_CLIENT_PORT,
      useClass: YoutubeApiClient,
    },
    SearchMusicUseCase
  ]
})
export class MusicModule {}
