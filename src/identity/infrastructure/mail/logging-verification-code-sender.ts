import { Logger } from '@nestjs/common';
import {
  VerificationCodeMail,
  VerificationCodeSender,
} from 'src/identity/application/ports/verification-code-sender';

// E2E mode only (see isE2eMode): no email is sent, the code is logged so that
// scripts/lib.sh can read it. The format of the line is relied upon by lib.sh.
export class LoggingVerificationCodeSender implements VerificationCodeSender {
  readonly logger = new Logger(LoggingVerificationCodeSender.name);

  send(mail: VerificationCodeMail): Promise<void> {
    this.logger.log(
      `E2E verification code account=${mail.accountId} code=${mail.code}`,
    );
    return Promise.resolve();
  }
}
