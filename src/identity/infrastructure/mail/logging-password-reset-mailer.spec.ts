import { LoggingPasswordResetMailer } from './logging-password-reset-mailer';

const resetCodeMail = {
  accountId: 'account-id',
  email: 'alice@example.com',
  code: '123456',
};

describe('LoggingPasswordResetMailer', () => {
  let mailer: LoggingPasswordResetMailer;
  let loggedMessages: jest.SpyInstance;

  beforeEach(() => {
    mailer = new LoggingPasswordResetMailer();
    loggedMessages = jest
      .spyOn(mailer.logger, 'log')
      .mockImplementation(() => undefined);
  });

  // The end-to-end scripts parse this exact line: the format is the contract
  it('logs the code with the account id, in the format read by the scripts', async () => {
    await mailer.sendResetCode(resetCodeMail);

    expect(loggedMessages).toHaveBeenCalledWith(
      'E2E password reset code account=account-id code=123456',
    );
  });

  it('logs the password change with the account id', async () => {
    await mailer.sendPasswordChanged({
      accountId: 'account-id',
      email: 'alice@example.com',
    });

    expect(loggedMessages).toHaveBeenCalledWith(
      'E2E password changed account=account-id',
    );
  });

  it('never logs the email address', async () => {
    await mailer.sendResetCode(resetCodeMail);

    expect(loggedMessages).not.toHaveBeenCalledWith(
      expect.stringContaining('alice@example.com'),
    );
  });
});
