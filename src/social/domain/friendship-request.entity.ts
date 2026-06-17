export class FriendshipRequest {
  constructor(
    public readonly id: string,
    public readonly senderId: string,
    public readonly receiverId: string,
  ) {}

  static create(infos: {
    id: string;
    senderId: string;
    receiverId: string;
  }): FriendshipRequest {
    return new FriendshipRequest(infos.id, infos.senderId, infos.receiverId);
  }
}
