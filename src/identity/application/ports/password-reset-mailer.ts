export type PasswordResetCodeMail = {
  // Only used to log: the email address is personal data, the id is not
  accountId: string;
  email: string;
  code: string;
};

export type PasswordChangedMail = {
  accountId: string;
  email: string;
};

export interface PasswordResetMailer {
  sendResetCode(mail: PasswordResetCodeMail): Promise<void>;
  // Warns the owner of the account, in case they did not ask for it
  sendPasswordChanged(mail: PasswordChangedMail): Promise<void>;
}

export const PASSWORD_RESET_MAILER = Symbol('PasswordResetMailer');
