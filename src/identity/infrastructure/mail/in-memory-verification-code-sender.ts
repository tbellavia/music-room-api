import {
  VerificationCodeMail,
  VerificationCodeSender,
} from 'src/identity/application/ports/verification-code-sender';
import { VerificationEmailNotSent } from 'src/identity/domain/errors/verification-email-not-sent.error';

// Test double for use-case specs: records the emails instead of sending them
export class InMemoryVerificationCodeSender implements VerificationCodeSender {
  public readonly sentMails: VerificationCodeMail[] = [];
  public isFailing = false;

  send(mail: VerificationCodeMail): Promise<void> {
    if (this.isFailing) {
      return Promise.reject(new VerificationEmailNotSent());
    }
    this.sentMails.push(mail);
    return Promise.resolve();
  }
}
