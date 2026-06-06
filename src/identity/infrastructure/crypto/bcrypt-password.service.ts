import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { genSalt, hash } from "bcrypt-ts";

@Injectable()
export class BcryptPasswordService {
    constructor(private readonly config: ConfigService) {}

    async hash(password: string): Promise<string> {
        const rounds = this.config.get<number>('BCRYPT_SALT_ROUNDS');
        const salt = await genSalt(rounds);

        return hash(password, salt);
    }
}