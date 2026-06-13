import { Controller, Get } from '@nestjs/common';
import { Public } from './interface/http/decorators/public.decorator';

@Controller()
export class AppController {
  @Public()
  @Get('health')
  health() {
    return { success: true };
  }
}
