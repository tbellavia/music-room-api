export type VerificationCodeMail = {
  // Only used to log: the email address is personal data, the id is not
  accountId: string;
  email: string;
  code: string;
};

export interface VerificationCodeSender {
  // Must fail with VerificationEmailNotSent if the email could not be sent
  send(mail: VerificationCodeMail): Promise<void>;
}

export const VERIFICATION_CODE_SENDER = Symbol('VerificationCodeSender');
