import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { createValidationPipe } from './interface/http/validation/validation-pipe';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(createValidationPipe());

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
