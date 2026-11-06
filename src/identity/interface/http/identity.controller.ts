import { Body, Controller, Get, Post } from '@nestjs/common';
import { RegisterAccountUseCase } from 'src/identity/application/use-cases/register-account/register-account.usecase';
import { RegisterAccountDto } from './dto/register-account.dto';
import { SignInDto } from './dto/sign-in.dto';
import { SignInUseCase } from 'src/identity/application/use-cases/sign-in/sign-in.usecase';
import { Public } from 'src/interface/http/decorators/public.decorator';
import { VerifyDto } from './dto/verify.dto';
import { VerifyAccountUseCase } from 'src/identity/application/use-cases/verify/verify-account.usecase';
import { ResendVerificationCodeDto } from './dto/resend-verification-code.dto';
import { ResendVerificationCodeUseCase } from 'src/identity/application/use-cases/resend-verification-code/resend-verification-code.usecase';

@Controller('identity')
export class IdentityController {
  constructor(
    private readonly registerAccount: RegisterAccountUseCase,
    private readonly signInAccount: SignInUseCase,
    private readonly verifyAccount: VerifyAccountUseCase,
    private readonly resendVerificationCode: ResendVerificationCodeUseCase,
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

  @Public()
  @Post('verify')
  async verify(@Body() verifyDto: VerifyDto) {
    await this.verifyAccount.execute({
      username: verifyDto.username,
      otp_code: verifyDto.otp_code,
    });
  }

  @Public()
  @Post('verify/resend')
  async resendCode(@Body() resendDto: ResendVerificationCodeDto) {
    await this.resendVerificationCode.execute({
      username: resendDto.username,
    });
  }

  @Get('profile')
  getProfile() {
    return { success: true };
  }
}
