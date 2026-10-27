import { InMemoryPlaylistRepository } from 'src/playlist/infrastructure/persistence/playlist/in-memory-playlist.repository';
import { InMemoryParticipantRepository } from 'src/playlist/infrastructure/persistence/participant/in-memory-participant.repository';
import { InMemoryTrackRepository } from 'src/playlist/infrastructure/persistence/track/in-memory-track.repository';
import { InMemoryVoteRepository } from 'src/playlist/infrastructure/persistence/vote/in-memory-vote.repository';
import { RxjsPlaylistEventBus } from 'src/playlist/infrastructure/events/rxjs-playlist-event-bus';
import { PlaylistEvent } from 'src/playlist/application/ports/playlist-event-bus';
import { Playlist } from 'src/playlist/domain/playlist.entity';
import { PlaylistType } from 'src/playlist/domain/playlist-type.enum';
import { Participant } from 'src/playlist/domain/participant.entity';
import { JoinMethod } from 'src/playlist/domain/join-method.enum';
import { Track } from 'src/playlist/domain/track.entity';
import { TrackVote } from 'src/playlist/domain/track-vote.entity';
import { VoteNotFound } from 'src/playlist/domain/errors/vote-not-found.error';
import { TrackAlreadyPlayed } from 'src/playlist/domain/errors/track-already-played.error';
import { OutsidePlaylistZone } from 'src/playlist/domain/errors/outside-playlist-zone.error';
import { WithdrawVoteUseCase } from './withdraw-vote.usecase';
import { WithdrawVoteInput } from './withdraw-vote.contracts';

const PLAYLIST_LATITUDE = 48.8966;
const PLAYLIST_LONGITUDE = 2.3184;

const input: WithdrawVoteInput = {
  playlistId: 'playlist-id',
  trackId: 'track-id',
  accountId: 'voter-id',
  position: { latitude: PLAYLIST_LATITUDE, longitude: PLAYLIST_LONGITUDE },
};

describe('WithdrawVoteUseCase', () => {
  let trackRepository: InMemoryTrackRepository;
  let voteRepository: InMemoryVoteRepository;
  let publishedEvents: PlaylistEvent[];
  let useCase: WithdrawVoteUseCase;
  let track: Track;

  beforeEach(async () => {
    const playlistRepository = new InMemoryPlaylistRepository();
    const participantRepository = new InMemoryParticipantRepository();
    trackRepository = new InMemoryTrackRepository();
    voteRepository = new InMemoryVoteRepository();
    const eventBus = new RxjsPlaylistEventBus();
    publishedEvents = [];
    eventBus
      .streamFor('playlist-id')
      .subscribe((event) => publishedEvents.push(event));
    useCase = new WithdrawVoteUseCase(
      playlistRepository,
      participantRepository,
      trackRepository,
      voteRepository,
      eventBus,
    );

    const playlist = Playlist.create({
      id: 'playlist-id',
      type: PlaylistType.VOTE,
      ownerId: 'owner-id',
      name: 'Soirée',
      description: '',
      latitude: PLAYLIST_LATITUDE,
      longitude: PLAYLIST_LONGITUDE,
    });
    await playlistRepository.save(playlist);

    const voter = Participant.create({
      id: 'voter-participant-id',
      playlistId: 'playlist-id',
      accountId: 'voter-id',
      joinedVia: JoinMethod.JOIN,
    });
    await participantRepository.save(voter);

    track = Track.create({
      id: 'track-id',
      playlistId: 'playlist-id',
      music: {
        videoId: 'FGBhQbmPwH8',
        name: 'One More Time',
        artist: 'Daft Punk',
        thumbnail: null,
        duration: 321,
      },
      addedBy: 'author-id',
      addedAt: new Date('2026-06-15T20:00:00Z'),
    });
    await trackRepository.save(track);
  });

  async function givenVote(accountId: string) {
    const vote = TrackVote.create({ trackId: 'track-id', accountId });
    await voteRepository.add(vote);
  }

  it('removes the vote and returns the new count', async () => {
    await givenVote('voter-id');
    await givenVote('other-voter-id');

    const { votes } = await useCase.execute(input);

    expect(votes).toBe(1);
    const remainingVoters = voteRepository.votes.map((vote) => vote.accountId);
    expect(remainingVoters).toEqual(['other-voter-id']);
  });

  it('publishes the new count of votes', async () => {
    await givenVote('voter-id');

    await useCase.execute(input);

    expect(publishedEvents).toEqual([
      {
        type: 'track.votes_changed',
        playlistId: 'playlist-id',
        trackId: 'track-id',
        votes: 0,
      },
    ]);
  });

  it('rejects a withdrawal without a previous vote', async () => {
    await givenVote('other-voter-id');

    await expect(useCase.execute(input)).rejects.toThrow(VoteNotFound);
    expect(voteRepository.votes).toHaveLength(1);
  });

  it('rejects a withdrawal on a played track', async () => {
    await givenVote('voter-id');
    track.markAsPlayed();
    await trackRepository.save(track);

    await expect(useCase.execute(input)).rejects.toThrow(TrackAlreadyPlayed);
    expect(voteRepository.votes).toHaveLength(1);
  });

  it('requires the participant to be on site', async () => {
    await givenVote('voter-id');

    const noPositionInput = { ...input, position: null };

    await expect(useCase.execute(noPositionInput)).rejects.toThrow(
      OutsidePlaylistZone,
    );
    expect(voteRepository.votes).toHaveLength(1);
  });
});
