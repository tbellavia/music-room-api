import { InMemoryFriendshipRequestRepository } from 'src/social/infrastructure/persistence/friendship-request/in-memory-friendship-request.repository';
import { FriendshipRequest } from 'src/social/domain/friendship-request.entity';
import { FriendshipRequestNotFound } from 'src/social/domain/errors/friendship-request-not-found.error';
import { RejectFriendshipUseCase } from './reject-friendship.usecase';
import { RejectFriendshipInput } from './reject-friendship.contracts';

const input: RejectFriendshipInput = {
  requestId: 'request-id',
  receiverId: 'receiver-id',
};

describe('RejectFriendshipUseCase', () => {
  let requestRepository: InMemoryFriendshipRequestRepository;
  let useCase: RejectFriendshipUseCase;

  beforeEach(async () => {
    requestRepository = new InMemoryFriendshipRequestRepository();
    useCase = new RejectFriendshipUseCase(requestRepository);

    const request = FriendshipRequest.create({
      id: 'request-id',
      senderId: 'sender-id',
      receiverId: 'receiver-id',
    });
    await requestRepository.save(request);
  });

  it('deletes the request', async () => {
    await useCase.execute(input);

    expect(requestRepository.requests.has('request-id')).toBe(false);
  });

  it('does not let the sender reject their own request', async () => {
    const senderInput = { requestId: 'request-id', receiverId: 'sender-id' };

    await expect(useCase.execute(senderInput)).rejects.toThrow(
      FriendshipRequestNotFound,
    );
    expect(requestRepository.requests.has('request-id')).toBe(true);
  });

  it('rejects an unknown request', async () => {
    const unknownInput = { ...input, requestId: 'unknown-request-id' };

    await expect(useCase.execute(unknownInput)).rejects.toThrow(
      FriendshipRequestNotFound,
    );
  });
});
