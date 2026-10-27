import { Track } from './track.entity';
import { TrackVote } from './track-vote.entity';

export type RankedTrack = {
  track: Track;
  votes: number;
};

// Most voted first; on a tie, the track added first comes first
export function rankTracks(tracks: Track[], votes: TrackVote[]): RankedTrack[] {
  const votesByTrackId = new Map<string, number>();
  for (const vote of votes) {
    const currentVotes = votesByTrackId.get(vote.trackId) ?? 0;
    votesByTrackId.set(vote.trackId, currentVotes + 1);
  }

  const rankedTracks: RankedTrack[] = tracks.map((track) => ({
    track,
    votes: votesByTrackId.get(track.id) ?? 0,
  }));

  rankedTracks.sort((first, second) => {
    if (first.votes !== second.votes) {
      return second.votes - first.votes;
    }
    return first.track.addedAt.getTime() - second.track.addedAt.getTime();
  });

  return rankedTracks;
}
