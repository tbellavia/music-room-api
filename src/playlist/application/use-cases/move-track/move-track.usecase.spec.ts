import { InMemoryPlaylistRepository } from 'src/playlist/infrastructure/persistence/playlist/in-memory-playlist.repository';
import { InMemoryParticipantRepository } from 'src/playlist/infrastructure/persistence/participant/in-memory-participant.repository';
import { InMemoryTrackRepository } from 'src/playlist/infrastructure/persistence/track/in-memory-track.repository';
import { RxjsPlaylistEventBus } from 'src/playlist/infrastructure/events/rxjs-playlist-event-bus';
import { InProcessPlaylistEditLock } from 'src/playlist/infrastructure/locks/in-process-playlist-edit-lock';
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
import { sortByPosition } from 'src/playlist/domain/track-ordering';
import { PlaylistNotFound } from 'src/playlist/domain/errors/playlist-not-found.error';
import { NotAnEditorPlaylist } from 'src/playlist/domain/errors/not-an-editor-playlist.error';
import { NotPlaylistMember } from 'src/playlist/domain/errors/not-playlist-member.error';
import { TrackActionForbidden } from 'src/playlist/domain/errors/track-action-forbidden.error';
import { PlaylistEnded } from 'src/playlist/domain/errors/playlist-ended.error';
import { InvalidMove } from 'src/playlist/domain/errors/invalid-move.error';
import { TrackNotFound } from 'src/playlist/domain/errors/track-not-found.error';
import { TrackVersionConflict } from 'src/playlist/domain/errors/track-version-conflict.error';
import { MoveTrackUseCase } from './move-track.usecase';
import { MoveTrackInput } from './move-track.contracts';

const defaultInfos: CreatePlaylistInfos = {
  id: 'playlist-id',
  type: PlaylistType.EDITOR,
  ownerId: 'owner-id',
  name: 'Radio',
  description: '',
  latitude: 48.8966,
  longitude: 2.3184,
};

// Moves the first track (version 1) to the end, as the owner
const moveFirstToEnd: MoveTrackInput = {
  playlistId: 'playlist-id',
  trackId: 'first',
  accountId: 'owner-id',
  afterTrackId: 'third',
  version: 1,
};

describe('MoveTrackUseCase', () => {
  let playlistRepository: InMemoryPlaylistRepository;
  let participantRepository: InMemoryParticipantRepository;
  let trackRepository: InMemoryTrackRepository;
  let publishedEvents: PlaylistEvent[];
  let useCase: MoveTrackUseCase;

  async function givenPlaylist(overrides: Partial<CreatePlaylistInfos> = {}) {
    const playlist = Playlist.create({ ...defaultInfos, ...overrides });
    await playlistRepository.save(playlist);
  }

  async function givenTrack(id: string, position: number) {
    const track = Track.create({
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
      addedAt: new Date('2026-06-15T20:00:00Z'),
      position,
    });
    await trackRepository.save(track);
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

  async function readOrder(): Promise<string[]> {
    const tracks = await trackRepository.findUnplayedByPlaylist('playlist-id');
    return sortByPosition(tracks).map((track) => track.id);
  }

  async function readVersion(trackId: string): Promise<number | undefined> {
    const track = await trackRepository.findById(trackId);
    expect(track).not.toBeNull();
    return track?.version;
  }

  beforeEach(async () => {
    playlistRepository = new InMemoryPlaylistRepository();
    participantRepository = new InMemoryParticipantRepository();
    trackRepository = new InMemoryTrackRepository();
    const eventBus = new RxjsPlaylistEventBus();
    publishedEvents = [];
    eventBus
      .streamFor('playlist-id')
      .subscribe((event) => publishedEvents.push(event));
    useCase = new MoveTrackUseCase(
      playlistRepository,
      participantRepository,
      trackRepository,
      eventBus,
      new InProcessPlaylistEditLock(),
    );

    await givenTrack('first', 1024);
    await givenTrack('second', 2048);
    await givenTrack('third', 3072);
  });

  describe('moves', () => {
    beforeEach(async () => {
      await givenPlaylist();
    });

    it('moves a track to the end', async () => {
      await useCase.execute(moveFirstToEnd);

      expect(await readOrder()).toEqual(['second', 'third', 'first']);
    });

    it('moves a track to the top', async () => {
      await useCase.execute({
        ...moveFirstToEnd,
        trackId: 'third',
        afterTrackId: null,
      });

      expect(await readOrder()).toEqual(['third', 'first', 'second']);
    });

    it('moves a track between two others', async () => {
      await useCase.execute({ ...moveFirstToEnd, afterTrackId: 'second' });

      expect(await readOrder()).toEqual(['second', 'first', 'third']);
    });

    it('only changes the position of the moved track', async () => {
      await useCase.execute(moveFirstToEnd);

      const second = await trackRepository.findById('second');
      const third = await trackRepository.findById('third');
      expect(second?.position).toBe(2048);
      expect(third?.position).toBe(3072);
    });

    it('returns the new version of the track', async () => {
      const { version } = await useCase.execute(moveFirstToEnd);

      expect(version).toBe(2);
      expect(await readVersion('first')).toBe(2);
    });

    it('publishes a track.moved event', async () => {
      await useCase.execute(moveFirstToEnd);

      expect(publishedEvents).toEqual([
        {
          type: 'track.moved',
          playlistId: 'playlist-id',
          trackId: 'first',
          afterTrackId: 'third',
          version: 2,
        },
      ]);
    });

    it('lets a participant move a track remotely, before the start', async () => {
      await givenPlaylist({ beginAt: new Date('2999-01-01') });
      await givenParticipant();

      await useCase.execute({ ...moveFirstToEnd, accountId: 'participant-id' });

      expect(await readOrder()).toEqual(['second', 'third', 'first']);
    });
  });

  describe('concurrency', () => {
    beforeEach(async () => {
      await givenPlaylist();
    });

    it('refuses a move based on an outdated version', async () => {
      await useCase.execute(moveFirstToEnd);

      // Someone still seeing version 1 tries to move it back to the top
      const outdatedMove = { ...moveFirstToEnd, afterTrackId: null };

      await expect(useCase.execute(outdatedMove)).rejects.toThrow(
        TrackVersionConflict,
      );
      expect(await readOrder()).toEqual(['second', 'third', 'first']);
      expect(publishedEvents).toHaveLength(1);
    });

    it('lets only one of two simultaneous moves of the same track pass', async () => {
      const aliceMove = useCase.execute(moveFirstToEnd);
      const bobMove = useCase.execute({
        ...moveFirstToEnd,
        afterTrackId: 'second',
      });

      const results = await Promise.allSettled([aliceMove, bobMove]);

      const statuses = results.map((result) => result.status);
      expect(statuses).toEqual(['fulfilled', 'rejected']);
      const bobResult = results[1];
      if (bobResult.status === 'rejected') {
        expect(bobResult.reason).toBeInstanceOf(TrackVersionConflict);
      }
      // Alice's move is kept, Bob's did not overwrite it
      expect(await readOrder()).toEqual(['second', 'third', 'first']);
      expect(await readVersion('first')).toBe(2);
    });

    it('applies two simultaneous moves of different tracks', async () => {
      const aliceMove = useCase.execute(moveFirstToEnd);
      const bobMove = useCase.execute({
        ...moveFirstToEnd,
        trackId: 'third',
        afterTrackId: null,
      });

      await Promise.all([aliceMove, bobMove]);

      // first is after third, and third is at the top
      expect(await readOrder()).toEqual(['third', 'second', 'first']);
    });

    it('renumbers the playlist when there is no room left between two tracks', async () => {
      await givenTrack('squeezed', 1024 + 1e-9);

      await useCase.execute({
        ...moveFirstToEnd,
        trackId: 'third',
        afterTrackId: 'first',
      });

      expect(await readOrder()).toEqual([
        'first',
        'third',
        'squeezed',
        'second',
      ]);
      // Renumbering is not a move: the other versions do not change
      expect(await readVersion('squeezed')).toBe(1);
    });
  });

  describe('errors', () => {
    it('rejects a track placed after itself', async () => {
      await givenPlaylist();

      const selfMove = { ...moveFirstToEnd, afterTrackId: 'first' };

      await expect(useCase.execute(selfMove)).rejects.toThrow(InvalidMove);
    });

    it('rejects an unknown track', async () => {
      await givenPlaylist();

      const unknownMove = { ...moveFirstToEnd, trackId: 'unknown-id' };

      await expect(useCase.execute(unknownMove)).rejects.toThrow(TrackNotFound);
    });

    it('rejects an unknown anchor track', async () => {
      await givenPlaylist();

      const unknownAnchorMove = { ...moveFirstToEnd, afterTrackId: 'unknown' };

      await expect(useCase.execute(unknownAnchorMove)).rejects.toThrow(
        TrackNotFound,
      );
      expect(await readOrder()).toEqual(['first', 'second', 'third']);
    });

    it('rejects a VOTE playlist', async () => {
      await givenPlaylist({ type: PlaylistType.VOTE });

      await expect(useCase.execute(moveFirstToEnd)).rejects.toThrow(
        NotAnEditorPlaylist,
      );
    });

    it('rejects someone who is not a member', async () => {
      await givenPlaylist();

      const strangerMove = { ...moveFirstToEnd, accountId: 'stranger-id' };

      await expect(useCase.execute(strangerMove)).rejects.toThrow(
        NotPlaylistMember,
      );
    });

    it('applies the INVITED_ONLY license', async () => {
      await givenPlaylist({ license: PlaylistLicense.INVITED_ONLY });
      await givenParticipant(JoinMethod.JOIN);

      const joinedMove = { ...moveFirstToEnd, accountId: 'participant-id' };

      await expect(useCase.execute(joinedMove)).rejects.toThrow(
        TrackActionForbidden,
      );
    });

    it('rejects an ended playlist', async () => {
      await givenPlaylist({ endAt: new Date('2000-01-01') });

      await expect(useCase.execute(moveFirstToEnd)).rejects.toThrow(
        PlaylistEnded,
      );
    });

    it('rejects an unknown playlist', async () => {
      await expect(useCase.execute(moveFirstToEnd)).rejects.toThrow(
        PlaylistNotFound,
      );
    });
  });
});
