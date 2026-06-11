import { Body, Controller, Post } from '@nestjs/common';
import { RegisterAccountUseCase } from 'src/identity/application/use-cases/register-account/register-account.usercase';
import { RegisterAccountDto } from './dto/register-account.dto';

@Controller('identity')
export class IdentityController {
  constructor(private readonly registerAccount: RegisterAccountUseCase) {}

  @Post('register')
  async register(@Body() registerAccountDto: RegisterAccountDto) {
    return await this.registerAccount.execute({
      username: registerAccountDto.username,
      password: registerAccountDto.password,
      email: registerAccountDto.email,
    });
  }
}
