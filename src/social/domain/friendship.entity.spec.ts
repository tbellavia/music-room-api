import { SelfFriendshipError } from './errors/self-friendship.error';
import { Friendship } from './friendship.entity';

describe('Friendship', () => {
  describe('create', () => {
    it('stores the two users in a stable order', () => {
      const friendship = Friendship.create({
        id: 'friendship-id',
        userA: 'user-b',
        userB: 'user-a',
      });

      expect(friendship.userA).toBe('user-a');
      expect(friendship.userB).toBe('user-b');
    });

    it('gives the same order whatever the order of the input', () => {
      const firstFriendship = Friendship.create({
        id: 'first-id',
        userA: 'user-a',
        userB: 'user-b',
      });
      const secondFriendship = Friendship.create({
        id: 'second-id',
        userA: 'user-b',
        userB: 'user-a',
      });

      expect(secondFriendship.userA).toBe(firstFriendship.userA);
      expect(secondFriendship.userB).toBe(firstFriendship.userB);
    });

    it('rejects a friendship with oneself', () => {
      const createSelfFriendship = () =>
        Friendship.create({
          id: 'friendship-id',
          userA: 'user-a',
          userB: 'user-a',
        });

      expect(createSelfFriendship).toThrow(SelfFriendshipError);
    });
  });

  describe('involves', () => {
    const friendship = Friendship.create({
      id: 'friendship-id',
      userA: 'user-a',
      userB: 'user-b',
    });

    it('is true for both users', () => {
      expect(friendship.involves('user-a')).toBe(true);
      expect(friendship.involves('user-b')).toBe(true);
    });

    it('is false for another user', () => {
      expect(friendship.involves('user-c')).toBe(false);
    });
  });
});
