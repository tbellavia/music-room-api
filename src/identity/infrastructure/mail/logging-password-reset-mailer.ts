import { Logger } from '@nestjs/common';
import {
  PasswordChangedMail,
  PasswordResetCodeMail,
  PasswordResetMailer,
} from 'src/identity/application/ports/password-reset-mailer';

// E2E mode only (see isE2eMode): no email is sent, the code is logged so that
// scripts/lib.sh can read it. The format of the line is relied upon by lib.sh.
export class LoggingPasswordResetMailer implements PasswordResetMailer {
  readonly logger = new Logger(LoggingPasswordResetMailer.name);

  sendResetCode(mail: PasswordResetCodeMail): Promise<void> {
    this.logger.log(
      `E2E password reset code account=${mail.accountId} code=${mail.code}`,
    );
    return Promise.resolve();
  }

  sendPasswordChanged(mail: PasswordChangedMail): Promise<void> {
    this.logger.log(`E2E password changed account=${mail.accountId}`);
    return Promise.resolve();
  }
}
