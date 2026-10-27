import { InMemoryPlaylistRepository } from 'src/playlist/infrastructure/persistence/playlist/in-memory-playlist.repository';
import { InMemoryParticipantRepository } from 'src/playlist/infrastructure/persistence/participant/in-memory-participant.repository';
import { InMemoryTrackRepository } from 'src/playlist/infrastructure/persistence/track/in-memory-track.repository';
import { InMemoryVoteRepository } from 'src/playlist/infrastructure/persistence/vote/in-memory-vote.repository';
import { RxjsPlaylistEventBus } from 'src/playlist/infrastructure/events/rxjs-playlist-event-bus';
import { PlaylistEvent } from 'src/playlist/application/ports/playlist-event-bus';
import {
  CreatePlaylistInfos,
  Playlist,
} from 'src/playlist/domain/playlist.entity';
import { PlaylistType } from 'src/playlist/domain/playlist-type.enum';
import { Participant } from 'src/playlist/domain/participant.entity';
import { JoinMethod } from 'src/playlist/domain/join-method.enum';
import { Track } from 'src/playlist/domain/track.entity';
import { TrackVote } from 'src/playlist/domain/track-vote.entity';
import { NotPlaylistMember } from 'src/playlist/domain/errors/not-playlist-member.error';
import { OutsidePlaylistZone } from 'src/playlist/domain/errors/outside-playlist-zone.error';
import { TrackNotFound } from 'src/playlist/domain/errors/track-not-found.error';
import { TrackAlreadyPlayed } from 'src/playlist/domain/errors/track-already-played.error';
import { CannotVoteOwnTrack } from 'src/playlist/domain/errors/cannot-vote-own-track.error';
import { AlreadyVoted } from 'src/playlist/domain/errors/already-voted.error';
import { NotAVotePlaylist } from 'src/playlist/domain/errors/not-a-vote-playlist.error';
import { VoteForTrackUseCase } from './vote-for-track.usecase';
import { VoteForTrackInput } from './vote-for-track.contracts';

// One degree of latitude is ~111 195 meters
const ONE_METER_IN_LATITUDE_DEGREES = 1 / 111_195;

const PLAYLIST_LATITUDE = 48.8966;
const PLAYLIST_LONGITUDE = 2.3184;

const ON_SITE_POSITION = {
  latitude: PLAYLIST_LATITUDE + 400 * ONE_METER_IN_LATITUDE_DEGREES,
  longitude: PLAYLIST_LONGITUDE,
};

const defaultInfos: CreatePlaylistInfos = {
  id: 'playlist-id',
  type: PlaylistType.VOTE,
  ownerId: 'owner-id',
  name: 'Soirée',
  description: '',
  latitude: PLAYLIST_LATITUDE,
  longitude: PLAYLIST_LONGITUDE,
};

const input: VoteForTrackInput = {
  playlistId: 'playlist-id',
  trackId: 'track-id',
  accountId: 'voter-id',
  position: ON_SITE_POSITION,
};

describe('VoteForTrackUseCase', () => {
  let playlistRepository: InMemoryPlaylistRepository;
  let participantRepository: InMemoryParticipantRepository;
  let trackRepository: InMemoryTrackRepository;
  let voteRepository: InMemoryVoteRepository;
  let publishedEvents: PlaylistEvent[];
  let useCase: VoteForTrackUseCase;

  async function givenPlaylist(overrides: Partial<CreatePlaylistInfos> = {}) {
    const playlist = Playlist.create({ ...defaultInfos, ...overrides });
    await playlistRepository.save(playlist);
  }

  async function givenParticipant(accountId: string) {
    const participant = Participant.create({
      id: `${accountId}-participant`,
      playlistId: 'playlist-id',
      accountId,
      joinedVia: JoinMethod.JOIN,
    });
    await participantRepository.save(participant);
  }

  async function givenTrack() {
    const track = Track.create({
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
    return track;
  }

  beforeEach(async () => {
    playlistRepository = new InMemoryPlaylistRepository();
    participantRepository = new InMemoryParticipantRepository();
    trackRepository = new InMemoryTrackRepository();
    voteRepository = new InMemoryVoteRepository();
    const eventBus = new RxjsPlaylistEventBus();
    publishedEvents = [];
    eventBus
      .streamFor('playlist-id')
      .subscribe((event) => publishedEvents.push(event));
    useCase = new VoteForTrackUseCase(
      playlistRepository,
      participantRepository,
      trackRepository,
      voteRepository,
      eventBus,
    );

    await givenParticipant('voter-id');
    await givenParticipant('author-id');
  });

  it('records the vote and returns the new count', async () => {
    await givenPlaylist();
    await givenTrack();

    const { votes } = await useCase.execute(input);

    expect(votes).toBe(1);
    expect(voteRepository.votes).toHaveLength(1);
  });

  it('publishes the new count of votes', async () => {
    await givenPlaylist();
    await givenTrack();
    await voteRepository.add(
      TrackVote.create({ trackId: 'track-id', accountId: 'other-voter-id' }),
    );

    await useCase.execute(input);

    expect(publishedEvents).toEqual([
      {
        type: 'track.votes_changed',
        playlistId: 'playlist-id',
        trackId: 'track-id',
        votes: 2,
      },
    ]);
  });

  it('lets the owner vote without position', async () => {
    await givenPlaylist();
    await givenTrack();

    const ownerInput = { ...input, accountId: 'owner-id', position: null };
    const { votes } = await useCase.execute(ownerInput);

    expect(votes).toBe(1);
  });

  it('does not let the author vote for their own track', async () => {
    await givenPlaylist();
    await givenTrack();

    const authorInput = { ...input, accountId: 'author-id' };

    await expect(useCase.execute(authorInput)).rejects.toThrow(
      CannotVoteOwnTrack,
    );
    expect(voteRepository.votes).toHaveLength(0);
  });

  it('rejects a second vote of the same account', async () => {
    await givenPlaylist();
    await givenTrack();
    await useCase.execute(input);

    await expect(useCase.execute(input)).rejects.toThrow(AlreadyVoted);
    expect(voteRepository.votes).toHaveLength(1);
  });

  it('rejects a vote for a played track', async () => {
    await givenPlaylist();
    const track = await givenTrack();
    track.markAsPlayed();
    await trackRepository.save(track);

    await expect(useCase.execute(input)).rejects.toThrow(TrackAlreadyPlayed);
  });

  it('rejects a participant outside the zone', async () => {
    await givenPlaylist();
    await givenTrack();

    const noPositionInput = { ...input, position: null };

    await expect(useCase.execute(noPositionInput)).rejects.toThrow(
      OutsidePlaylistZone,
    );
    expect(publishedEvents).toHaveLength(0);
  });

  it('rejects someone who is not a member', async () => {
    await givenPlaylist();
    await givenTrack();

    const strangerInput = { ...input, accountId: 'stranger-id' };

    await expect(useCase.execute(strangerInput)).rejects.toThrow(
      NotPlaylistMember,
    );
  });

  it('rejects an unknown track', async () => {
    await givenPlaylist();

    await expect(useCase.execute(input)).rejects.toThrow(TrackNotFound);
  });

  it('rejects a track of another playlist', async () => {
    await givenPlaylist();
    await givenPlaylist({ id: 'other-playlist-id', name: 'Autre' });
    await givenTrack();

    const otherPlaylistInput = { ...input, playlistId: 'other-playlist-id' };
    const otherOwnerInput = {
      ...otherPlaylistInput,
      accountId: 'owner-id',
      position: null,
    };

    await expect(useCase.execute(otherOwnerInput)).rejects.toThrow(
      TrackNotFound,
    );
  });

  it('rejects an editor playlist', async () => {
    await givenPlaylist({ type: PlaylistType.EDITOR });

    await expect(useCase.execute(input)).rejects.toThrow(NotAVotePlaylist);
  });
});
