import { InMemoryPlaylistRepository } from 'src/playlist/infrastructure/persistence/playlist/in-memory-playlist.repository';
import { InMemoryParticipantRepository } from 'src/playlist/infrastructure/persistence/participant/in-memory-participant.repository';
import { InMemoryTrackRepository } from 'src/playlist/infrastructure/persistence/track/in-memory-track.repository';
import { InMemoryMusicCatalog } from 'src/playlist/infrastructure/music/in-memory-music-catalog';
import { RxjsPlaylistEventBus } from 'src/playlist/infrastructure/events/rxjs-playlist-event-bus';
import { PlaylistEvent } from 'src/playlist/application/ports/playlist-event-bus';
import {
  CreatePlaylistInfos,
  Playlist,
} from 'src/playlist/domain/playlist.entity';
import { PlaylistType } from 'src/playlist/domain/playlist-type.enum';
import { PlaylistLicense } from 'src/playlist/domain/playlist-license.enum';
import { Participant } from 'src/playlist/domain/participant.entity';
import { JoinMethod } from 'src/playlist/domain/join-method.enum';
import { Track } from 'src/playlist/domain/track.entity';
import { PlaylistNotFound } from 'src/playlist/domain/errors/playlist-not-found.error';
import { NotAVotePlaylist } from 'src/playlist/domain/errors/not-a-vote-playlist.error';
import { NotPlaylistMember } from 'src/playlist/domain/errors/not-playlist-member.error';
import { TrackActionForbidden } from 'src/playlist/domain/errors/track-action-forbidden.error';
import { OutsidePlaylistZone } from 'src/playlist/domain/errors/outside-playlist-zone.error';
import { PlaylistNotStarted } from 'src/playlist/domain/errors/playlist-not-started.error';
import { MusicNotFound } from 'src/playlist/domain/errors/music-not-found.error';
import { TrackAlreadyInPlaylist } from 'src/playlist/domain/errors/track-already-in-playlist.error';
import { AddTrackUseCase } from './add-track.usecase';
import { AddTrackInput } from './add-track.contracts';

// One degree of latitude is ~111 195 meters
const ONE_METER_IN_LATITUDE_DEGREES = 1 / 111_195;

const PLAYLIST_LATITUDE = 48.8966;
const PLAYLIST_LONGITUDE = 2.3184;

const ON_SITE_POSITION = {
  latitude: PLAYLIST_LATITUDE + 400 * ONE_METER_IN_LATITUDE_DEGREES,
  longitude: PLAYLIST_LONGITUDE,
};
const FAR_POSITION = {
  latitude: PLAYLIST_LATITUDE + 600 * ONE_METER_IN_LATITUDE_DEGREES,
  longitude: PLAYLIST_LONGITUDE,
};

const ONE_MORE_TIME = {
  videoId: 'FGBhQbmPwH8',
  name: 'One More Time',
  artist: 'Daft Punk',
  thumbnail: 'https://example.com/thumbnail.jpg',
  duration: 321,
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

const ownerInput: AddTrackInput = {
  playlistId: 'playlist-id',
  accountId: 'owner-id',
  videoId: ONE_MORE_TIME.videoId,
  position: null,
};

const participantInput: AddTrackInput = {
  playlistId: 'playlist-id',
  accountId: 'participant-id',
  videoId: ONE_MORE_TIME.videoId,
  position: ON_SITE_POSITION,
};

describe('AddTrackUseCase', () => {
  let playlistRepository: InMemoryPlaylistRepository;
  let participantRepository: InMemoryParticipantRepository;
  let trackRepository: InMemoryTrackRepository;
  let musicCatalog: InMemoryMusicCatalog;
  let publishedEvents: PlaylistEvent[];
  let useCase: AddTrackUseCase;

  async function givenPlaylist(overrides: Partial<CreatePlaylistInfos> = {}) {
    const playlist = Playlist.create({ ...defaultInfos, ...overrides });
    await playlistRepository.save(playlist);
  }

  async function givenParticipant(joinedVia: JoinMethod = JoinMethod.JOIN) {
    const participant = Participant.create({
      id: 'participant-row-id',
      playlistId: 'playlist-id',
      accountId: 'participant-id',
      joinedVia,
    });
    await participantRepository.save(participant);
  }

  beforeEach(() => {
    playlistRepository = new InMemoryPlaylistRepository();
    participantRepository = new InMemoryParticipantRepository();
    trackRepository = new InMemoryTrackRepository();
    musicCatalog = new InMemoryMusicCatalog();
    const eventBus = new RxjsPlaylistEventBus();
    publishedEvents = [];
    eventBus
      .streamFor('playlist-id')
      .subscribe((event) => publishedEvents.push(event));
    useCase = new AddTrackUseCase(
      playlistRepository,
      participantRepository,
      trackRepository,
      musicCatalog,
      eventBus,
    );

    musicCatalog.add(ONE_MORE_TIME);
  });

  it('adds the track with the informations of the catalog', async () => {
    await givenPlaylist();

    const { trackId } = await useCase.execute(ownerInput);

    const track = trackRepository.tracks.get(trackId);
    expect(track).toBeDefined();
    expect(track?.playlistId).toBe('playlist-id');
    expect(track?.name).toBe('One More Time');
    expect(track?.artist).toBe('Daft Punk');
    expect(track?.duration).toBe(321);
    expect(track?.addedBy).toBe('owner-id');
    expect(track?.isPlayed()).toBe(false);
  });

  it('publishes a track.added event with no vote', async () => {
    await givenPlaylist();

    const { trackId } = await useCase.execute(ownerInput);

    expect(publishedEvents).toHaveLength(1);
    const event = publishedEvents[0];
    expect(event.type).toBe('track.added');
    if (event.type === 'track.added') {
      expect(event.track.id).toBe(trackId);
      expect(event.track.votes).toBe(0);
    }
  });

  it('lets the owner add a track before the start, without position', async () => {
    await givenPlaylist({ beginAt: new Date('2999-01-01') });

    await useCase.execute(ownerInput);

    expect(trackRepository.tracks.size).toBe(1);
  });

  it('lets a participant on site add a track', async () => {
    await givenPlaylist();
    await givenParticipant();

    const { trackId } = await useCase.execute(participantInput);

    const track = trackRepository.tracks.get(trackId);
    expect(track?.addedBy).toBe('participant-id');
  });

  it('rejects a participant outside the zone', async () => {
    await givenPlaylist();
    await givenParticipant();

    const farInput = { ...participantInput, position: FAR_POSITION };

    await expect(useCase.execute(farInput)).rejects.toThrow(
      OutsidePlaylistZone,
    );
    expect(trackRepository.tracks.size).toBe(0);
    expect(publishedEvents).toHaveLength(0);
  });

  it('rejects a participant before the playlist starts', async () => {
    await givenPlaylist({ beginAt: new Date('2999-01-01') });
    await givenParticipant();

    await expect(useCase.execute(participantInput)).rejects.toThrow(
      PlaylistNotStarted,
    );
  });

  it('rejects someone who is not a member', async () => {
    await givenPlaylist();

    await expect(useCase.execute(participantInput)).rejects.toThrow(
      NotPlaylistMember,
    );
  });

  describe('with the INVITED_ONLY license', () => {
    it('rejects a participant who joined by themselves', async () => {
      await givenPlaylist({ license: PlaylistLicense.INVITED_ONLY });
      await givenParticipant(JoinMethod.JOIN);

      await expect(useCase.execute(participantInput)).rejects.toThrow(
        TrackActionForbidden,
      );
    });

    it('accepts an invited participant', async () => {
      await givenPlaylist({ license: PlaylistLicense.INVITED_ONLY });
      await givenParticipant(JoinMethod.INVITATION);

      await useCase.execute(participantInput);

      expect(trackRepository.tracks.size).toBe(1);
    });
  });

  it('rejects an editor playlist', async () => {
    await givenPlaylist({ type: PlaylistType.EDITOR });

    await expect(useCase.execute(ownerInput)).rejects.toThrow(NotAVotePlaylist);
  });

  it('rejects an unknown playlist', async () => {
    await expect(useCase.execute(ownerInput)).rejects.toThrow(PlaylistNotFound);
  });

  it('rejects a video unknown to the catalog', async () => {
    await givenPlaylist();

    const unknownVideoInput = { ...ownerInput, videoId: 'unknownvide' };

    await expect(useCase.execute(unknownVideoInput)).rejects.toThrow(
      MusicNotFound,
    );
  });

  it('rejects a music already waiting in the playlist', async () => {
    await givenPlaylist();
    await useCase.execute(ownerInput);

    await expect(useCase.execute(ownerInput)).rejects.toThrow(
      TrackAlreadyInPlaylist,
    );
    expect(trackRepository.tracks.size).toBe(1);
  });

  it('accepts a music again once it has been played', async () => {
    await givenPlaylist();
    const playedTrack = Track.create({
      id: 'played-track-id',
      playlistId: 'playlist-id',
      music: ONE_MORE_TIME,
      addedBy: 'owner-id',
      addedAt: new Date('2026-06-15T20:00:00Z'),
    });
    playedTrack.markAsPlayed();
    await trackRepository.save(playedTrack);

    await useCase.execute(ownerInput);

    expect(trackRepository.tracks.size).toBe(2);
  });
});
