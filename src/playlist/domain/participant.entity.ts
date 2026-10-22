export class Participant {
  constructor(
    public readonly id: string,
    public readonly playlistId: string,
    public readonly accountId: string,
    public hasPrivilege: boolean,
  ) {}

  static create(infos: {
    id: string;
    playlistId: string;
    accountId: string;
  }): Participant {
    return new Participant(infos.id, infos.playlistId, infos.accountId, false);
  }
}
