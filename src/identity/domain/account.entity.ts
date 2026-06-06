export class Account {
    constructor(
        public readonly id: string,
        public readonly username: string,
        public readonly email: string,
        public readonly password: string
    ) {}
}