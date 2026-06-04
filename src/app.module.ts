import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigurationModule } from './config/config.module';

@Module({
  imports: [
    ConfigurationModule
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
