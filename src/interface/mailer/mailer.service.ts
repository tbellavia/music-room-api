import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  constructor(private readonly configService: ConfigService) {}

  async sendMail(infos: { to: string; subject: string; html: string }) {
    const transport = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: this.configService.get<string>('MAIL'),
        pass: this.configService.get<string>('MAIL_PASSWORD'),
      },
    });

    return new Promise((resolve, reject) => {
      transport.sendMail(
        {
          from: process.env.MAIL_USERNAME,
          to: infos.to,
          subject: infos.subject,
          html: infos.html,
        },
        (err, info) => {
          if (err) reject(err);
          else resolve(info);
        },
      );
    });
  }
}
