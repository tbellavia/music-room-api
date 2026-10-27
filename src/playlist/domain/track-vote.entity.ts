// One vote of one account for one track: there is no vote counter to update,
// the score of a track is the number of its votes
export class TrackVote {
  constructor(
    public readonly trackId: string,
    public readonly accountId: string,
  ) {}

  static create(infos: { trackId: string; accountId: string }): TrackVote {
    return new TrackVote(infos.trackId, infos.accountId);
  }
}
