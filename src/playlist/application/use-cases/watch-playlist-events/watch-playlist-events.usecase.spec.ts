import { InMemoryPlaylistRepository } from 'src/playlist/infrastructure/persistence/playlist/in-memory-playlist.repository';
import { InMemoryParticipantRepository } from 'src/playlist/infrastructure/persistence/participant/in-memory-participant.repository';
import { RxjsPlaylistEventBus } from 'src/playlist/infrastructure/events/rxjs-playlist-event-bus';
import { PlaylistEvent } from 'src/playlist/application/ports/playlist-event-bus';
import {
  CreatePlaylistInfos,
  Playlist,
} from 'src/playlist/domain/playlist.entity';
import { PlaylistType } from 'src/playlist/domain/playlist-type.enum';
import { PlaylistNotFound } from 'src/playlist/domain/errors/playlist-not-found.error';
import { NotPlaylistMember } from 'src/playlist/domain/errors/not-playlist-member.error';
import { WatchPlaylistEventsUseCase } from './watch-playlist-events.usecase';

const defaultInfos: CreatePlaylistInfos = {
  id: 'playlist-id',
  type: PlaylistType.VOTE,
  ownerId: 'owner-id',
  name: 'Soirée',
  description: '',
  latitude: 48.8966,
  longitude: 2.3184,
};

const playedEvent: PlaylistEvent = {
  type: 'track.played',
  playlistId: 'playlist-id',
  trackId: 'track-id',
};

describe('WatchPlaylistEventsUseCase', () => {
  let playlistRepository: InMemoryPlaylistRepository;
  let eventBus: RxjsPlaylistEventBus;
  let useCase: WatchPlaylistEventsUseCase;

  async function givenPlaylist(overrides: Partial<CreatePlaylistInfos> = {}) {
    const playlist = Playlist.create({ ...defaultInfos, ...overrides });
    await playlistRepository.save(playlist);
  }

  beforeEach(() => {
    playlistRepository = new InMemoryPlaylistRepository();
    const participantRepository = new InMemoryParticipantRepository();
    eventBus = new RxjsPlaylistEventBus();
    useCase = new WatchPlaylistEventsUseCase(
      playlistRepository,
      participantRepository,
      eventBus,
    );
  });

  it('streams the events of the playlist only', async () => {
    await givenPlaylist();
    const receivedEvents: PlaylistEvent[] = [];

    const events = await useCase.execute({
      playlistId: 'playlist-id',
      accountId: 'owner-id',
    });
    events.subscribe((event) => receivedEvents.push(event));
    eventBus.publish(playedEvent);
    eventBus.publish({ ...playedEvent, playlistId: 'other-playlist-id' });

    expect(receivedEvents).toEqual([playedEvent]);
  });

  it('lets anyone watch a public playlist', async () => {
    await givenPlaylist();

    const events = await useCase.execute({
      playlistId: 'playlist-id',
      accountId: 'stranger-id',
    });

    expect(events).toBeDefined();
  });

  it('does not let a non member watch a private playlist', async () => {
    await givenPlaylist({ isPrivate: true });

    await expect(
      useCase.execute({ playlistId: 'playlist-id', accountId: 'stranger-id' }),
    ).rejects.toThrow(NotPlaylistMember);
  });

  it('rejects an unknown playlist', async () => {
    await expect(
      useCase.execute({ playlistId: 'unknown-id', accountId: 'owner-id' }),
    ).rejects.toThrow(PlaylistNotFound);
  });
});
