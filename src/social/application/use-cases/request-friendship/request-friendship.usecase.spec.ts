import { InMemoryFriendshipRequestRepository } from 'src/social/infrastructure/persistence/friendship-request/in-memory-friendship-request.repository';
import { InMemoryFriendshipRepository } from 'src/social/infrastructure/persistence/friendship/in-memory-friendship.repository';
import { FriendshipRequest } from 'src/social/domain/friendship-request.entity';
import { Friendship } from 'src/social/domain/friendship.entity';
import { SelfFriendshipRequestError } from 'src/social/domain/errors/self-friendship-request.error';
import { FriendshipRequestAlreadyExists } from 'src/social/domain/errors/friendship-request-already-exists.error';
import { FriendshipAlreadyExists } from 'src/social/domain/errors/friendship-already-exists.error';
import { RequestFriendshipUseCase } from './request-friendship.usecase';
import { RequestFriendshipInput } from './request-friendship.contracts';

const input: RequestFriendshipInput = {
  senderId: 'sender-id',
  receiverId: 'receiver-id',
};

describe('RequestFriendshipUseCase', () => {
  let requestRepository: InMemoryFriendshipRequestRepository;
  let friendshipRepository: InMemoryFriendshipRepository;
  let useCase: RequestFriendshipUseCase;

  beforeEach(() => {
    requestRepository = new InMemoryFriendshipRequestRepository();
    friendshipRepository = new InMemoryFriendshipRepository();
    useCase = new RequestFriendshipUseCase(
      requestRepository,
      friendshipRepository,
    );
  });

  it('creates a pending request from the sender to the receiver', async () => {
    const { requestId } = await useCase.execute(input);

    const request = requestRepository.requests.get(requestId);
    expect(request).toBeDefined();
    expect(request?.senderId).toBe('sender-id');
    expect(request?.receiverId).toBe('receiver-id');
  });

  it('rejects a request to oneself', async () => {
    const selfInput = { senderId: 'sender-id', receiverId: 'sender-id' };

    await expect(useCase.execute(selfInput)).rejects.toThrow(
      SelfFriendshipRequestError,
    );
    expect(requestRepository.requests.size).toBe(0);
  });

  it('rejects a second request to the same receiver', async () => {
    await useCase.execute(input);

    await expect(useCase.execute(input)).rejects.toThrow(
      FriendshipRequestAlreadyExists,
    );
    expect(requestRepository.requests.size).toBe(1);
  });

  it('rejects a request when the receiver already sent one to the sender', async () => {
    const receivedRequest = FriendshipRequest.create({
      id: 'received-request-id',
      senderId: 'receiver-id',
      receiverId: 'sender-id',
    });
    await requestRepository.save(receivedRequest);

    await expect(useCase.execute(input)).rejects.toThrow(
      FriendshipRequestAlreadyExists,
    );
    expect(requestRepository.requests.size).toBe(1);
  });

  it('rejects a request when both users are already friends', async () => {
    const friendship = Friendship.create({
      id: 'friendship-id',
      userA: 'receiver-id',
      userB: 'sender-id',
    });
    await friendshipRepository.save(friendship);

    await expect(useCase.execute(input)).rejects.toThrow(
      FriendshipAlreadyExists,
    );
    expect(requestRepository.requests.size).toBe(0);
  });

  it('allows the same sender to request several receivers', async () => {
    await useCase.execute(input);
    await useCase.execute({ ...input, receiverId: 'other-receiver-id' });

    expect(requestRepository.requests.size).toBe(2);
  });
});
