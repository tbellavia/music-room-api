import { LoggingVerificationCodeSender } from './logging-verification-code-sender';

describe('LoggingVerificationCodeSender', () => {
  // The end-to-end scripts parse this exact line: the format is the contract
  it('logs the code with the account id, in the format read by the scripts', async () => {
    const sender = new LoggingVerificationCodeSender();
    const loggedMessages = jest
      .spyOn(sender.logger, 'log')
      .mockImplementation(() => undefined);

    await sender.send({
      accountId: 'account-id',
      email: 'alice@example.com',
      code: '123456',
    });

    expect(loggedMessages).toHaveBeenCalledWith(
      'E2E verification code account=account-id code=123456',
    );
  });

  it('never logs the email address', async () => {
    const sender = new LoggingVerificationCodeSender();
    const loggedMessages = jest
      .spyOn(sender.logger, 'log')
      .mockImplementation(() => undefined);

    await sender.send({
      accountId: 'account-id',
      email: 'alice@example.com',
      code: '123456',
    });

    expect(loggedMessages).toHaveBeenCalledTimes(1);
    expect(loggedMessages).not.toHaveBeenCalledWith(
      expect.stringContaining('alice@example.com'),
    );
  });
});
