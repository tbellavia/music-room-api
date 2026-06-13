import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigurationModule } from './infrastructure/config/config.module';
import { APP_FILTER } from '@nestjs/core';
import { HttpExceptionFilter } from './interface/http/filters/http-exception.filter';
import { DatabaseModule } from './infrastructure/database/database.module';
import { IdentityModule } from './identity/identity.module';

@Module({
  imports: [ConfigurationModule, DatabaseModule, IdentityModule],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
