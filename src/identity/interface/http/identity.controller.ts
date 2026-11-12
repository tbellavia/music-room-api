import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { RegisterAccountUseCase } from 'src/identity/application/use-cases/register-account/register-account.usecase';
import { RegisterAccountDto } from './dto/register-account.dto';
import { SignInDto } from './dto/sign-in.dto';
import { SignInUseCase } from 'src/identity/application/use-cases/sign-in/sign-in.usecase';
import { Public } from 'src/interface/http/decorators/public.decorator';
import { VerifyDto } from './dto/verify.dto';
import { VerifyAccountUseCase } from 'src/identity/application/use-cases/verify/verify-account.usecase';
import { ResendVerificationCodeDto } from './dto/resend-verification-code.dto';
import { ResendVerificationCodeUseCase } from 'src/identity/application/use-cases/resend-verification-code/resend-verification-code.usecase';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { RequestPasswordResetUseCase } from 'src/identity/application/use-cases/request-password-reset/request-password-reset.usecase';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResetPasswordUseCase } from 'src/identity/application/use-cases/reset-password/reset-password.usecase';
import { GoogleSignInDto } from './dto/google-sign-in.dto';
import { SignInWithGoogleUseCase } from 'src/identity/application/use-cases/sign-in-with-google/sign-in-with-google.usecase';

@Controller('identity')
export class IdentityController {
  constructor(
    private readonly registerAccount: RegisterAccountUseCase,
    private readonly signInAccount: SignInUseCase,
    private readonly verifyAccount: VerifyAccountUseCase,
    private readonly resendVerificationCode: ResendVerificationCodeUseCase,
    private readonly requestPasswordReset: RequestPasswordResetUseCase,
    private readonly resetAccountPassword: ResetPasswordUseCase,
    private readonly signInWithGoogle: SignInWithGoogleUseCase,
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

  // 200 whether the account is created or already exists: the app does the same
  @Public()
  @Post('google')
  @HttpCode(200)
  async googleSignIn(@Body() googleSignInDto: GoogleSignInDto) {
    return await this.signInWithGoogle.execute({
      id_token: googleSignInDto.id_token,
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

  // 202 whatever the username: the response never tells whether it has an account
  @Public()
  @Post('password/forgot')
  @HttpCode(202)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    await this.requestPasswordReset.execute({
      username: forgotPasswordDto.username,
    });
  }

  @Public()
  @Post('password/reset')
  @HttpCode(204)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    await this.resetAccountPassword.execute({
      username: resetPasswordDto.username,
      otp_code: resetPasswordDto.otp_code,
      new_password: resetPasswordDto.new_password,
    });
  }

  @Get('profile')
  getProfile() {
    return { success: true };
  }
}
