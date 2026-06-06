import { Inject, Injectable } from "@nestjs/common";
import { RegisterAccountInput, RegisterAccountOutput } from "./register-account.contracts";
import { ACCOUNT_REPOSITORY, AccountRepository } from "../../ports/account.repository";
import { BcryptPasswordService } from "src/identity/infrastructure/crypto/bcrypt-password.service";
import { Account } from "src/identity/domain/account.entity";
import { randomUUID } from "crypto";

@Injectable()
export class RegisterAccountUseCase {
    constructor(
        @Inject(ACCOUNT_REPOSITORY)
        private readonly repository: AccountRepository,
        private readonly passwordHasher: BcryptPasswordService
    ) {}

    async execute(input: RegisterAccountInput): Promise<RegisterAccountOutput> {
        const hashedPassword: string = await this.passwordHasher.hash(input.password);
        const account = new Account(
            randomUUID(),
            input.username,
            input.email,
            hashedPassword,
        );

        await this.repository.save(account);
        return { id: account.id };
    }
}