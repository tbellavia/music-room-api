import { FriendshipRepository } from 'src/social/application/ports/friendship.repository';
import { Friendship } from 'src/social/domain/friendship.entity';

// Test double for use-case specs: no database involved
export class InMemoryFriendshipRepository implements FriendshipRepository {
  public readonly friendships = new Map<string, Friendship>();

  findAllByUserId(userId: string): Promise<Friendship[]> {
    const userFriendships: Friendship[] = [];
    for (const friendship of this.friendships.values()) {
      if (friendship.involves(userId)) {
        userFriendships.push(friendship);
      }
    }
    return Promise.resolve(userFriendships);
  }

  findByUsersId(infos: {
    userA: string;
    userB: string;
  }): Promise<Friendship | null> {
    for (const friendship of this.friendships.values()) {
      if (
        friendship.involves(infos.userA) &&
        friendship.involves(infos.userB)
      ) {
        return Promise.resolve(friendship);
      }
    }
    return Promise.resolve(null);
  }

  save(friendship: Friendship): Promise<void> {
    this.friendships.set(friendship.id, friendship);
    return Promise.resolve();
  }
}
