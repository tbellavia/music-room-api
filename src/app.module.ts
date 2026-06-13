import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigurationModule } from './infrastructure/config/config.module';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { HttpExceptionFilter } from './interface/http/filters/http-exception.filter';
import { DatabaseModule } from './infrastructure/database/database.module';
import { IdentityModule } from './identity/identity.module';
import { JwtAuthGuard } from './interface/http/guards/jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [ConfigurationModule, DatabaseModule, IdentityModule],
  controllers: [AppController],
  providers: [
    JwtService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
