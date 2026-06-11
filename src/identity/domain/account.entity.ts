import { AuthMethod } from './auth-method.enum';

export class Account {
  constructor(
    public readonly id: string,
    public readonly username: string,
    public readonly email: string,
    public readonly password: string,
    public readonly auth_method: AuthMethod,
  ) {}

  static local(infos: {
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
      AuthMethod.GOOGLE,
    );
  }
}
