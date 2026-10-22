import { InMemoryFriendshipRequestRepository } from 'src/social/infrastructure/persistence/friendship-request/in-memory-friendship-request.repository';
import { FriendshipRequest } from 'src/social/domain/friendship-request.entity';
import { FriendshipRequestNotFound } from 'src/social/domain/errors/friendship-request-not-found.error';
import { CancelFriendshipRequestUseCase } from './cancel-friendship-request.usecase';
import { CancelFriendshipRequestInput } from './cancel-friendship-request.contracts';

const input: CancelFriendshipRequestInput = {
  requestId: 'request-id',
  senderId: 'sender-id',
};

describe('CancelFriendshipRequestUseCase', () => {
  let requestRepository: InMemoryFriendshipRequestRepository;
  let useCase: CancelFriendshipRequestUseCase;

  beforeEach(async () => {
    requestRepository = new InMemoryFriendshipRequestRepository();
    useCase = new CancelFriendshipRequestUseCase(requestRepository);

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

  it('does not let the receiver cancel the request', async () => {
    const receiverInput = { requestId: 'request-id', senderId: 'receiver-id' };

    await expect(useCase.execute(receiverInput)).rejects.toThrow(
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
