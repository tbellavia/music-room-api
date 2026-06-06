import { Account } from "src/identity/domain/account.entity";

export interface AccountRepository {
    findByEmail(email: string): Promise<Account | null>;
    findById(id: string): Promise<Account | null>;
    save(account: Account): Promise<void>;
}

export const ACCOUNT_REPOSITORY = Symbol('AccountRepository');