import { Account } from 'src/identity/domain/account.entity';

export class Participants {
  constructor(
    public id: string,
    public track_vote_playlist_id: string,
    public track_editor_playlist_id: string,
    public account: Account,
    public has_privilege: boolean,
  ) {}
}
