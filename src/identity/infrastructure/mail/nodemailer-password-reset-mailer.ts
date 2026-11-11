import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transporter } from 'nodemailer';
import {
  PasswordChangedMail,
  PasswordResetCodeMail,
  PasswordResetMailer,
} from 'src/identity/application/ports/password-reset-mailer';
import { createGmailTransport } from './gmail-transport';
import {
  passwordChangedTemplate,
  passwordResetCodeTemplate,
} from './password-reset.template';

// The errors are left to the caller: the use-cases send without waiting,
// and log a failure instead of revealing it to the client
@Injectable()
export class NodemailerPasswordResetMailer implements PasswordResetMailer {
  private readonly logger = new Logger(NodemailerPasswordResetMailer.name);
  private readonly transport: Transporter;
  private readonly senderAddress: string | undefined;

  constructor(configService: ConfigService) {
    const gmail = createGmailTransport(configService);
    this.transport = gmail.transport;
    this.senderAddress = gmail.senderAddress;
  }

  async sendResetCode(mail: PasswordResetCodeMail): Promise<void> {
    await this.transport.sendMail({
      from: this.senderAddress,
      to: mail.email,
      subject: 'Réinitialisation de votre mot de passe',
      html: passwordResetCodeTemplate(mail.code),
    });
    this.logger.debug(`Password reset email sent account=${mail.accountId}`);
  }

  async sendPasswordChanged(mail: PasswordChangedMail): Promise<void> {
    await this.transport.sendMail({
      from: this.senderAddress,
      to: mail.email,
      subject: 'Votre mot de passe a été modifié',
      html: passwordChangedTemplate(),
    });
    this.logger.debug(`Password changed email sent account=${mail.accountId}`);
  }
}
