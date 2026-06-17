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
    BcryptPasswordService,
    TypeOrmAccountRepository,
    RegisterAccountUseCase,
    SignInUseCase,
  ],
  exports: [JwtModule],
})
export class IdentityModule {}
