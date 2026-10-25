export class Invitation {
  constructor(
    public readonly id: string,
    public readonly playlistId: string,
    public readonly inviterId: string,
    public readonly inviteeId: string,
  ) {}

  static create(infos: {
    id: string;
    playlistId: string;
    inviterId: string;
    inviteeId: string;
  }): Invitation {
    return new Invitation(
      infos.id,
      infos.playlistId,
      infos.inviterId,
      infos.inviteeId,
    );
  }

  isInvitee(accountId: string): boolean {
    return this.inviteeId === accountId;
  }

  isInviter(accountId: string): boolean {
    return this.inviterId === accountId;
  }
}
