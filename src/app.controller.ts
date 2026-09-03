import { Controller, Get } from '@nestjs/common';
import { Public } from './interface/http/decorators/public.decorator';
import YTMusic from 'ytmusic-api';

@Controller()
export class AppController {
  @Public()
  @Get('health')
  health() {
    return { success: true };
  }

  @Public()
  @Get('music')
  async musics(): Promise<any> {
    const api = new YTMusic();
    await api.initialize();
    const songs = await api.search("Versace on the floor");

    return songs.filter(item => item.type == "SONG").map(item => `https://youtube.com/watch?v=${item.videoId}`);
  }
}
