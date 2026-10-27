import { JoinMethod } from './join-method.enum';

export class Participant {
  constructor(
    public readonly id: string,
    public readonly playlistId: string,
    public readonly accountId: string,
    public hasPrivilege: boolean,
    public readonly joinedVia: JoinMethod,
  ) {}

  static create(infos: {
    id: string;
    playlistId: string;
    accountId: string;
    joinedVia: JoinMethod;
  }): Participant {
    return new Participant(
      infos.id,
      infos.playlistId,
      infos.accountId,
      false,
      infos.joinedVia,
    );
  }

  wasInvited(): boolean {
    return this.joinedVia === JoinMethod.INVITATION;
  }
}
