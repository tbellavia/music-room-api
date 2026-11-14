import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true,
      validationSchema: Joi.object({
        POSTGRES_HOST: Joi.string().hostname().required(),
        POSTGRES_PORT: Joi.number().port().required(),
        POSTGRES_USER: Joi.string().required(),
        POSTGRES_PASSWORD: Joi.string().min(8).required(),
        POSTGRES_DATABASE: Joi.string().required(),
        BCRYPT_SALT_ROUNDS: Joi.number().required(),
        JWT_SECRET: Joi.string().token().required(),
        GOOGLE_CLIENT_ID: Joi.string().required(),
        GOOGLE_CLIENT_SECRET: Joi.string().required(),
        MAIL: Joi.string().required(),
        MAIL_PASSWORD: Joi.string().required(),
        // dev: the JWT guard lets every request through (iOS development)
        // test: end-to-end scripts (make test-e2e)
        ENVIRONMENT: Joi.string().valid('dev', 'test', 'prod').default('prod'),
        // Never in production: verification codes would end up in the logs
        E2E_MODE: Joi.boolean()
          .default(false)
          .when('ENVIRONMENT', {
            is: 'prod',
            then: Joi.valid(false).messages({
              'any.only': 'E2E_MODE cannot be enabled when ENVIRONMENT=prod',
            }),
          }),
      }),
    }),
  ],
})
export class ConfigurationModule {}
