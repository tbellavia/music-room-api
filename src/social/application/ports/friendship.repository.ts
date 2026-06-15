import { Friendship } from 'src/social/domain/friendship.entity';

export interface FriendshipRepository {
  findAllByUserId(userId: string): Promise<Friendship[]>;
  save(friendship: Friendship): Promise<void>;
}

export const FRIENDSHIP_REPOSITORY = Symbol('FriendshipRepository');
