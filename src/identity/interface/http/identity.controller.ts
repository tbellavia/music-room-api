import { Body, Controller, Get, Post } from '@nestjs/common';
import { RegisterAccountUseCase } from 'src/identity/application/use-cases/register-account/register-account.usecase';
import { RegisterAccountDto } from './dto/register-account.dto';
import { SignInDto } from './dto/sign-in.dto';
import { SignInUseCase } from 'src/identity/application/use-cases/sign-in/sign-in.usecase';
import { Public } from 'src/interface/http/decorators/public.decorator';

@Controller('identity')
export class IdentityController {
  constructor(
    private readonly registerAccount: RegisterAccountUseCase,
    private readonly signInAccount: SignInUseCase,
  ) {}

  @Public()
  @Post('register')
  async register(@Body() registerAccountDto: RegisterAccountDto) {
    return await this.registerAccount.execute({
      username: registerAccountDto.username,
      password: registerAccountDto.password,
      email: registerAccountDto.email,
    });
  }

  @Public()
  @Post('login')
  async signIn(@Body() signInDto: SignInDto) {
    return await this.signInAccount.execute({
      username: signInDto.username,
      password: signInDto.password,
    });
  }

  @Get('profile')
  getProfile() {
    return { success: true };
  }
}
