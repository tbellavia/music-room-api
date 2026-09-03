import { Controller, Get, Param } from '@nestjs/common';
import { SearchMusicUseCase } from 'src/music/application/use-cases/search-music/search-music.usecase';
import { Public } from 'src/interface/http/decorators/public.decorator';

@Controller('music')
export class MusicController {
  constructor(private readonly searchMusic: SearchMusicUseCase) {}

  @Get('search/:name')
  @Public()
  async search(@Param('name') name: string) {
    return await this.searchMusic.execute({
      name: name
    });
  }
}
