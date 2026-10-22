import { InMemoryFriendshipRequestRepository } from 'src/social/infrastructure/persistence/friendship-request/in-memory-friendship-request.repository';
import { FriendshipRequest } from 'src/social/domain/friendship-request.entity';
import { GetPendingRequestsUseCase } from './get-pending-requests.usecase';

describe('GetPendingRequestsUseCase', () => {
  let requestRepository: InMemoryFriendshipRequestRepository;
  let useCase: GetPendingRequestsUseCase;

  async function givenRequest(infos: {
    id: string;
    senderId: string;
    receiverId: string;
  }) {
    const request = FriendshipRequest.create(infos);
    await requestRepository.save(request);
  }

  beforeEach(() => {
    requestRepository = new InMemoryFriendshipRequestRepository();
    useCase = new GetPendingRequestsUseCase(requestRepository);
  });

  it('returns an empty list when nothing was received', async () => {
    const { requests } = await useCase.execute({ receiverId: 'user-id' });

    expect(requests).toEqual([]);
  });

  it('returns the requests received by the user', async () => {
    await givenRequest({
      id: 'first-request-id',
      senderId: 'first-sender-id',
      receiverId: 'user-id',
    });
    await givenRequest({
      id: 'second-request-id',
      senderId: 'second-sender-id',
      receiverId: 'user-id',
    });

    const { requests } = await useCase.execute({ receiverId: 'user-id' });

    const requestIds = requests.map((request) => request.id);
    expect(requestIds).toHaveLength(2);
    expect(requestIds).toContain('first-request-id');
    expect(requestIds).toContain('second-request-id');
  });

  it('does not return the requests sent by the user', async () => {
    await givenRequest({
      id: 'sent-request-id',
      senderId: 'user-id',
      receiverId: 'other-user-id',
    });

    const { requests } = await useCase.execute({ receiverId: 'user-id' });

    expect(requests).toEqual([]);
  });

  it('does not return requests between other users', async () => {
    await givenRequest({
      id: 'other-request-id',
      senderId: 'other-sender-id',
      receiverId: 'other-receiver-id',
    });

    const { requests } = await useCase.execute({ receiverId: 'user-id' });

    expect(requests).toEqual([]);
  });
});
