import { Track } from './track.entity';
import { TrackVote } from './track-vote.entity';
import { rankTracks } from './track-ranking';

function buildTrack(id: string, addedAt: string) {
  return Track.create({
    id,
    playlistId: 'playlist-id',
    music: {
      videoId: `video-${id}`,
      name: id,
      artist: 'artist',
      thumbnail: null,
      duration: null,
    },
    addedBy: 'author-id',
    addedAt: new Date(addedAt),
  });
}

function buildVotes(trackId: string, count: number): TrackVote[] {
  const votes: TrackVote[] = [];
  for (let index = 0; index < count; index++) {
    votes.push(TrackVote.create({ trackId, accountId: `voter-${index}` }));
  }
  return votes;
}

describe('rankTracks', () => {
  const firstAdded = buildTrack('first', '2026-06-15T20:00:00Z');
  const secondAdded = buildTrack('second', '2026-06-15T20:05:00Z');
  const thirdAdded = buildTrack('third', '2026-06-15T20:10:00Z');

  it('puts the most voted tracks first', () => {
    const votes = [...buildVotes('first', 1), ...buildVotes('third', 3)];

    const ranking = rankTracks([firstAdded, secondAdded, thirdAdded], votes);

    const rankedIds = ranking.map((rankedTrack) => rankedTrack.track.id);
    expect(rankedIds).toEqual(['third', 'first', 'second']);
  });

  it('counts the votes of each track', () => {
    const votes = [...buildVotes('first', 2), ...buildVotes('second', 1)];

    const ranking = rankTracks([firstAdded, secondAdded], votes);

    const voteCounts = ranking.map((rankedTrack) => rankedTrack.votes);
    expect(voteCounts).toEqual([2, 1]);
  });

  it('puts the oldest track first on a tie', () => {
    const votes = [...buildVotes('second', 1), ...buildVotes('first', 1)];

    const ranking = rankTracks([secondAdded, firstAdded], votes);

    const rankedIds = ranking.map((rankedTrack) => rankedTrack.track.id);
    expect(rankedIds).toEqual(['first', 'second']);
  });

  it('gives zero votes to a track nobody voted for', () => {
    const ranking = rankTracks([firstAdded], []);

    expect(ranking[0].votes).toBe(0);
  });
});
