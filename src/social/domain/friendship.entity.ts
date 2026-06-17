import { SelfFriendshipError } from './errors/self-friendship.error';

export class Friendship {
  constructor(
    public readonly id: string,
    public readonly userA: string,
    public readonly userB: string,
  ) {}

  involves(userId: string): boolean {
    return this.userA == userId || this.userB == userId;
  }

  static create(infos: {
    id: string;
    userA: string;
    userB: string;
  }): Friendship {
    if (infos.userA === infos.userB) {
      throw new SelfFriendshipError();
    }

    const [a, b] =
      infos.userA < infos.userB
        ? [infos.userA, infos.userB]
        : [infos.userB, infos.userA];
    return new Friendship(infos.id, a, b);
  }
}
