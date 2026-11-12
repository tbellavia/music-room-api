export type VerifyAccountInput = {
  username: string;
  otp_code: string;
};

export type VerifyAccountOutput = {
  access_token: string;
};
