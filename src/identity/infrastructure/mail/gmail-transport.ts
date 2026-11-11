import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

export type GmailTransport = {
  transport: Transporter;
  senderAddress: string | undefined;
};

// Shared by every mailer: the account and its password come from .env
export function createGmailTransport(
  configService: ConfigService,
): GmailTransport {
  const senderAddress = configService.get<string>('MAIL');
  const transport = createTransport({
    service: 'Gmail',
    auth: {
      user: senderAddress,
      pass: configService.get<string>('MAIL_PASSWORD'),
    },
  });
  return { transport, senderAddress };
}
