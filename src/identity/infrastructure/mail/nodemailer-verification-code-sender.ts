import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transporter } from 'nodemailer';
import {
  VerificationCodeMail,
  VerificationCodeSender,
} from 'src/identity/application/ports/verification-code-sender';
import { VerificationEmailNotSent } from 'src/identity/domain/errors/verification-email-not-sent.error';
import { verificationCodeTemplate } from './verification-code.template';
import { createGmailTransport } from './gmail-transport';

@Injectable()
export class NodemailerVerificationCodeSender implements VerificationCodeSender {
  private readonly logger = new Logger(NodemailerVerificationCodeSender.name);
  private readonly transport: Transporter;
  private readonly senderAddress: string | undefined;

  constructor(configService: ConfigService) {
    const gmail = createGmailTransport(configService);
    this.transport = gmail.transport;
    this.senderAddress = gmail.senderAddress;
  }

  async send(mail: VerificationCodeMail): Promise<void> {
    try {
      await this.transport.sendMail({
        from: this.senderAddress,
        to: mail.email,
        subject: 'Votre code de validation',
        html: verificationCodeTemplate(mail.code),
      });
      this.logger.debug(`Verification email sent account=${mail.accountId}`);
    } catch (error) {
      // The SMTP error stays in the logs, the client only gets a stable code
      this.logger.error(
        `Verification email could not be sent account=${mail.accountId}`,
        error,
      );
      throw new VerificationEmailNotSent();
    }
  }
}
