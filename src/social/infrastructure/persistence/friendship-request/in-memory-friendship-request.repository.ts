import { FriendshipRequestRepository } from 'src/social/application/ports/friendship-request.repository';
import { FriendshipRequest } from 'src/social/domain/friendship-request.entity';

// Test double for use-case specs: no database involved
export class InMemoryFriendshipRequestRepository implements FriendshipRequestRepository {
  public readonly requests = new Map<string, FriendshipRequest>();

  findByRequestAndSenderId(infos: {
    requestId: string;
    senderId: string;
  }): Promise<FriendshipRequest | null> {
    const request = this.requests.get(infos.requestId);
    if (!request || request.senderId !== infos.senderId) {
      return Promise.resolve(null);
    }
    return Promise.resolve(request);
  }

  findByRequestAndReceiverId(infos: {
    requestId: string;
    receiverId: string;
  }): Promise<FriendshipRequest | null> {
    const request = this.requests.get(infos.requestId);
    if (!request || request.receiverId !== infos.receiverId) {
      return Promise.resolve(null);
    }
    return Promise.resolve(request);
  }

  findBySenderAndReceiverId(infos: {
    senderId: string;
    receiverId: string;
  }): Promise<FriendshipRequest | null> {
    for (const request of this.requests.values()) {
      const isSameSender = request.senderId === infos.senderId;
      const isSameReceiver = request.receiverId === infos.receiverId;
      if (isSameSender && isSameReceiver) {
        return Promise.resolve(request);
      }
    }
    return Promise.resolve(null);
  }

  findByReceiverId(receiverId: string): Promise<FriendshipRequest[]> {
    const receivedRequests: FriendshipRequest[] = [];
    for (const request of this.requests.values()) {
      if (request.receiverId === receiverId) {
        receivedRequests.push(request);
      }
    }
    return Promise.resolve(receivedRequests);
  }

  delete(id: string): Promise<void> {
    this.requests.delete(id);
    return Promise.resolve();
  }

  save(request: FriendshipRequest): Promise<void> {
    this.requests.set(request.id, request);
    return Promise.resolve();
  }
}
