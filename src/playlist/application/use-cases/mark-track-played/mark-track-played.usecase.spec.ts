import { InMemoryPlaylistRepository } from 'src/playlist/infrastructure/persistence/playlist/in-memory-playlist.repository';
import { InMemoryTrackRepository } from 'src/playlist/infrastructure/persistence/track/in-memory-track.repository';
import { RxjsPlaylistEventBus } from 'src/playlist/infrastructure/events/rxjs-playlist-event-bus';
import { PlaylistEvent } from 'src/playlist/application/ports/playlist-event-bus';
import { Playlist } from 'src/playlist/domain/playlist.entity';
import { PlaylistType } from 'src/playlist/domain/playlist-type.enum';
import { Track } from 'src/playlist/domain/track.entity';
import { NotPlaylistOwner } from 'src/playlist/domain/errors/not-playlist-owner.error';
import { TrackNotFound } from 'src/playlist/domain/errors/track-not-found.error';
import { TrackAlreadyPlayed } from 'src/playlist/domain/errors/track-already-played.error';
import { MarkTrackPlayedUseCase } from './mark-track-played.usecase';
import { MarkTrackPlayedInput } from './mark-track-played.contracts';

const input: MarkTrackPlayedInput = {
  playlistId: 'playlist-id',
  trackId: 'track-id',
  accountId: 'owner-id',
};

describe('MarkTrackPlayedUseCase', () => {
  let trackRepository: InMemoryTrackRepository;
  let publishedEvents: PlaylistEvent[];
  let useCase: MarkTrackPlayedUseCase;

  async function readTrack() {
    const track = await trackRepository.findById('track-id');
    expect(track).not.toBeNull();
    return track;
  }

  beforeEach(async () => {
    const playlistRepository = new InMemoryPlaylistRepository();
    trackRepository = new InMemoryTrackRepository();
    const eventBus = new RxjsPlaylistEventBus();
    publishedEvents = [];
    eventBus
      .streamFor('playlist-id')
      .subscribe((event) => publishedEvents.push(event));
    useCase = new MarkTrackPlayedUseCase(
      playlistRepository,
      trackRepository,
      eventBus,
    );

    const playlist = Playlist.create({
      id: 'playlist-id',
      type: PlaylistType.VOTE,
      ownerId: 'owner-id',
      name: 'Soirée',
      description: '',
      latitude: 48.8966,
      longitude: 2.3184,
    });
    await playlistRepository.save(playlist);

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
  });

  it('marks the track as played', async () => {
    await useCase.execute(input);

    const track = await readTrack();
    expect(track?.isPlayed()).toBe(true);
  });

  it('publishes a track.played event', async () => {
    await useCase.execute(input);

    expect(publishedEvents).toEqual([
      { type: 'track.played', playlistId: 'playlist-id', trackId: 'track-id' },
    ]);
  });

  it('is reserved to the owner', async () => {
    const participantInput = { ...input, accountId: 'participant-id' };

    await expect(useCase.execute(participantInput)).rejects.toThrow(
      NotPlaylistOwner,
    );
    const track = await readTrack();
    expect(track?.isPlayed()).toBe(false);
  });

  it('cannot mark the same track twice', async () => {
    await useCase.execute(input);

    await expect(useCase.execute(input)).rejects.toThrow(TrackAlreadyPlayed);
    expect(publishedEvents).toHaveLength(1);
  });

  it('rejects an unknown track', async () => {
    const unknownInput = { ...input, trackId: 'unknown-id' };

    await expect(useCase.execute(unknownInput)).rejects.toThrow(TrackNotFound);
  });
});
