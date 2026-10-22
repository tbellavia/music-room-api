import { InMemoryFriendshipRequestRepository } from 'src/social/infrastructure/persistence/friendship-request/in-memory-friendship-request.repository';
import { InMemoryFriendshipRepository } from 'src/social/infrastructure/persistence/friendship/in-memory-friendship.repository';
import { FriendshipRequest } from 'src/social/domain/friendship-request.entity';
import { UnknownFriendshipRequest } from 'src/social/domain/errors/unknown-friendship-request';
import { AcceptFriendshipUseCase } from './accept-friendship.usecase';
import { AcceptFriendshipInput } from './accept-friendship.contracts';

const input: AcceptFriendshipInput = {
  requestId: 'request-id',
  receiverId: 'receiver-id',
};

describe('AcceptFriendshipUseCase', () => {
  let requestRepository: InMemoryFriendshipRequestRepository;
  let friendshipRepository: InMemoryFriendshipRepository;
  let useCase: AcceptFriendshipUseCase;

  beforeEach(async () => {
    requestRepository = new InMemoryFriendshipRequestRepository();
    friendshipRepository = new InMemoryFriendshipRepository();
    useCase = new AcceptFriendshipUseCase(
      requestRepository,
      friendshipRepository,
    );

    const request = FriendshipRequest.create({
      id: 'request-id',
      senderId: 'sender-id',
      receiverId: 'receiver-id',
    });
    await requestRepository.save(request);
  });

  it('creates a friendship between the sender and the receiver', async () => {
    const { friendshipId } = await useCase.execute(input);

    const friendship = friendshipRepository.friendships.get(friendshipId);
    expect(friendship).toBeDefined();
    expect(friendship?.involves('sender-id')).toBe(true);
    expect(friendship?.involves('receiver-id')).toBe(true);
  });

  it('deletes the accepted request', async () => {
    await useCase.execute(input);

    expect(requestRepository.requests.has('request-id')).toBe(false);
  });

  it('does not let the sender accept their own request', async () => {
    const senderInput = { requestId: 'request-id', receiverId: 'sender-id' };

    await expect(useCase.execute(senderInput)).rejects.toThrow(
      UnknownFriendshipRequest,
    );
    expect(friendshipRepository.friendships.size).toBe(0);
    expect(requestRepository.requests.has('request-id')).toBe(true);
  });

  it('does not let another user accept the request', async () => {
    const strangerInput = {
      requestId: 'request-id',
      receiverId: 'stranger-id',
    };

    await expect(useCase.execute(strangerInput)).rejects.toThrow(
      UnknownFriendshipRequest,
    );
    expect(friendshipRepository.friendships.size).toBe(0);
  });

  it('rejects an unknown request', async () => {
    const unknownInput = { ...input, requestId: 'unknown-request-id' };

    await expect(useCase.execute(unknownInput)).rejects.toThrow(
      UnknownFriendshipRequest,
    );
  });

  it('cannot accept the same request twice', async () => {
    await useCase.execute(input);

    await expect(useCase.execute(input)).rejects.toThrow(
      UnknownFriendshipRequest,
    );
    expect(friendshipRepository.friendships.size).toBe(1);
  });
});
