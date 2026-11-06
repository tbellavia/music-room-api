import { Module } from '@nestjs/common';
import { IdentityController } from './interface/http/identity.controller';
import { RegisterAccountUseCase } from './application/use-cases/register-account/register-account.usecase';
import { ACCOUNT_REPOSITORY } from './application/ports/account.repository';
import { TypeOrmAccountRepository } from './infrastructure/persistence/typeorm-account.repository';
import { BcryptPasswordService } from './infrastructure/crypto/bcrypt-password.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountOrmEntity } from './infrastructure/persistence/typeorm-account.entity';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SignInUseCase } from './application/use-cases/sign-in/sign-in.usecase';
import { VerifyAccountUseCase } from './application/use-cases/verify/verify-account.usecase';
import { ResendVerificationCodeUseCase } from './application/use-cases/resend-verification-code/resend-verification-code.usecase';
import {
  VERIFICATION_CODE_SENDER,
  VerificationCodeSender,
} from './application/ports/verification-code-sender';
import { PASSWORD_HASHER } from './application/ports/password-hasher';
import { NodemailerVerificationCodeSender } from './infrastructure/mail/nodemailer-verification-code-sender';
import { LoggingVerificationCodeSender } from './infrastructure/mail/logging-verification-code-sender';
import { isE2eMode } from 'src/infrastructure/config/e2e-mode';

@Module({
  imports: [
    TypeOrmModule.forFeature([AccountOrmEntity]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        global: true,
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '60m' },
      }),
    }),
  ],
  controllers: [IdentityController],
  providers: [
    {
      provide: ACCOUNT_REPOSITORY,
      useClass: TypeOrmAccountRepository,
    },
    {
      provide: VERIFICATION_CODE_SENDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): VerificationCodeSender => {
        if (isE2eMode(config)) {
          return new LoggingVerificationCodeSender();
        }
        return new NodemailerVerificationCodeSender(config);
      },
    },
    {
      provide: PASSWORD_HASHER,
      useClass: BcryptPasswordService,
    },
    TypeOrmAccountRepository,
    RegisterAccountUseCase,
    SignInUseCase,
    VerifyAccountUseCase,
    ResendVerificationCodeUseCase,
  ],
  exports: [JwtModule],
})
export class IdentityModule {}
