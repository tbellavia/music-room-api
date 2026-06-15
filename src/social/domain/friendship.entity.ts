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

  static create(id: string, userA: string, userB: string): Friendship {
    if (userA === userB) {
      throw new SelfFriendshipError();
    }

    const [a, b] = userA < userB ? [userA, userB] : [userB, userA];
    return new Friendship(id, a, b);
  }
}
