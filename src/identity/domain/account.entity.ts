import { AuthMethod } from './auth-method.enum';

export class Account {
  constructor(
    public readonly id: string,
    public readonly username: string,
    public readonly email: string,
    public readonly password: string,
    public readonly otp_code: string | null,
    public readonly otp_expiry: Date | null,
    public readonly is_active: boolean,
    public readonly auth_method: AuthMethod,
  ) {}

  static local(infos: {
    id: string;
    username: string;
    email: string;
    password: string;
    otp_code: string;
    otp_expiry: Date;
  }): Account {
    return new Account(
      infos.id,
      infos.username,
      infos.email,
      infos.password,
      infos.otp_code,
      infos.otp_expiry,
      false,
      AuthMethod.LOCAL,
    );
  }

  static google(infos: {
    id: string;
    username: string;
    email: string;
    password: string;
  }): Account {
    return new Account(
      infos.id,
      infos.email,
      infos.username,
      infos.password,
      null,
      null,
      true,
      AuthMethod.GOOGLE,
    );
  }
}
