import {
  PasswordChangedMail,
  PasswordResetCodeMail,
  PasswordResetMailer,
} from 'src/identity/application/ports/password-reset-mailer';

// Test double for use-case specs: records the emails instead of sending them
export class InMemoryPasswordResetMailer implements PasswordResetMailer {
  public readonly sentResetCodes: PasswordResetCodeMail[] = [];
  public readonly sentPasswordChanged: PasswordChangedMail[] = [];
  public isFailing = false;

  sendResetCode(mail: PasswordResetCodeMail): Promise<void> {
    if (this.isFailing) {
      return Promise.reject(new Error('SMTP unavailable'));
    }
    this.sentResetCodes.push(mail);
    return Promise.resolve();
  }

  sendPasswordChanged(mail: PasswordChangedMail): Promise<void> {
    if (this.isFailing) {
      return Promise.reject(new Error('SMTP unavailable'));
    }
    this.sentPasswordChanged.push(mail);
    return Promise.resolve();
  }
}
