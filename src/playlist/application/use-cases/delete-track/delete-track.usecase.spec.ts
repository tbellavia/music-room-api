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
import { TrackDeleteForbidden } from 'src/playlist/domain/errors/track-delete-forbidden.error';
import { OutsidePlaylistZone } from 'src/playlist/domain/errors/outside-playlist-zone.error';
import { TrackNotFound } from 'src/playlist/domain/errors/track-not-found.error';
import { TrackAlreadyPlayed } from 'src/playlist/domain/errors/track-already-played.error';
import { NotPlaylistMember } from 'src/playlist/domain/errors/not-playlist-member.error';
import { DeleteTrackUseCase } from './delete-track.usecase';
import { DeleteTrackInput } from './delete-track.contracts';

const PLAYLIST_LATITUDE = 48.8966;
const PLAYLIST_LONGITUDE = 2.3184;
const ON_SITE_POSITION = {
  latitude: PLAYLIST_LATITUDE,
  longitude: PLAYLIST_LONGITUDE,
};

const ownerInput: DeleteTrackInput = {
  playlistId: 'playlist-id',
  trackId: 'track-id',
  accountId: 'owner-id',
  position: null,
};

const privilegedInput: DeleteTrackInput = {
  playlistId: 'playlist-id',
  trackId: 'track-id',
  accountId: 'privileged-id',
  position: ON_SITE_POSITION,
};

describe('DeleteTrackUseCase', () => {
  let playlistRepository: InMemoryPlaylistRepository;
  let participantRepository: InMemoryParticipantRepository;
  let trackRepository: InMemoryTrackRepository;
  let voteRepository: InMemoryVoteRepository;
  let publishedEvents: PlaylistEvent[];
  let useCase: DeleteTrackUseCase;
  let track: Track;

  async function givenParticipant(accountId: string, hasPrivilege: boolean) {
    const participant = new Participant(
      `${accountId}-participant`,
      'playlist-id',
      accountId,
      hasPrivilege,
      JoinMethod.JOIN,
    );
    await participantRepository.save(participant);
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
    useCase = new DeleteTrackUseCase(
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
    await voteRepository.add(
      TrackVote.create({ trackId: 'track-id', accountId: 'voter-id' }),
    );
  });

  it('lets the owner delete a track with its votes', async () => {
    await useCase.execute(ownerInput);

    expect(trackRepository.tracks.size).toBe(0);
    expect(voteRepository.votes).toHaveLength(0);
  });

  it('publishes a track.removed event', async () => {
    await useCase.execute(ownerInput);

    expect(publishedEvents).toEqual([
      {
        type: 'track.removed',
        playlistId: 'playlist-id',
        trackId: 'track-id',
      },
    ]);
  });

  it('lets a privileged participant on site delete a track', async () => {
    await givenParticipant('privileged-id', true);

    await useCase.execute(privilegedInput);

    expect(trackRepository.tracks.size).toBe(0);
  });

  it('requires a privileged participant to be on site', async () => {
    await givenParticipant('privileged-id', true);

    const noPositionInput = { ...privilegedInput, position: null };

    await expect(useCase.execute(noPositionInput)).rejects.toThrow(
      OutsidePlaylistZone,
    );
    expect(trackRepository.tracks.size).toBe(1);
  });

  it('does not let a regular participant delete a track', async () => {
    await givenParticipant('author-id', false);

    // Even the author of the track cannot delete it without privilege
    const authorInput = { ...privilegedInput, accountId: 'author-id' };

    await expect(useCase.execute(authorInput)).rejects.toThrow(
      TrackDeleteForbidden,
    );
    expect(trackRepository.tracks.size).toBe(1);
    expect(publishedEvents).toHaveLength(0);
  });

  it('rejects someone who is not a member', async () => {
    const strangerInput = { ...privilegedInput, accountId: 'stranger-id' };

    await expect(useCase.execute(strangerInput)).rejects.toThrow(
      NotPlaylistMember,
    );
  });

  it('rejects a played track', async () => {
    track.markAsPlayed();
    await trackRepository.save(track);

    await expect(useCase.execute(ownerInput)).rejects.toThrow(
      TrackAlreadyPlayed,
    );
    expect(trackRepository.tracks.size).toBe(1);
  });

  it('rejects an unknown track', async () => {
    const unknownInput = { ...ownerInput, trackId: 'unknown-id' };

    await expect(useCase.execute(unknownInput)).rejects.toThrow(TrackNotFound);
  });

  describe('in an EDITOR playlist', () => {
    const editorInput: DeleteTrackInput = {
      playlistId: 'editor-playlist-id',
      trackId: 'editor-track-id',
      accountId: 'author-id',
      position: null,
    };

    beforeEach(async () => {
      const editorPlaylist = Playlist.create({
        id: 'editor-playlist-id',
        type: PlaylistType.EDITOR,
        ownerId: 'owner-id',
        name: 'Radio',
        description: '',
        latitude: PLAYLIST_LATITUDE,
        longitude: PLAYLIST_LONGITUDE,
      });
      await playlistRepository.save(editorPlaylist);

      const editorTrack = Track.create({
        id: 'editor-track-id',
        playlistId: 'editor-playlist-id',
        music: {
          videoId: 'dQw4w9WgXcQ',
          name: 'Never Gonna Give You Up',
          artist: 'Rick Astley',
          thumbnail: null,
          duration: 213,
        },
        addedBy: 'author-id',
        addedAt: new Date('2026-06-15T20:00:00Z'),
        position: 1024,
      });
      await trackRepository.save(editorTrack);

      for (const accountId of ['author-id', 'other-id']) {
        const participant = Participant.create({
          id: `${accountId}-editor-participant`,
          playlistId: 'editor-playlist-id',
          accountId,
          joinedVia: JoinMethod.JOIN,
        });
        await participantRepository.save(participant);
      }
    });

    it('lets the author delete their own track, remotely', async () => {
      await useCase.execute(editorInput);

      expect(trackRepository.tracks.has('editor-track-id')).toBe(false);
    });

    it('does not let a regular participant delete the track of someone else', async () => {
      const otherInput = { ...editorInput, accountId: 'other-id' };

      await expect(useCase.execute(otherInput)).rejects.toThrow(
        TrackDeleteForbidden,
      );
      expect(trackRepository.tracks.has('editor-track-id')).toBe(true);
    });

    it('lets the owner delete any track, remotely', async () => {
      const ownerEditorInput = { ...editorInput, accountId: 'owner-id' };

      await useCase.execute(ownerEditorInput);

      expect(trackRepository.tracks.has('editor-track-id')).toBe(false);
    });
  });
});
