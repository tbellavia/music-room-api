import { InMemoryPlaylistRepository } from 'src/playlist/infrastructure/persistence/playlist/in-memory-playlist.repository';
import { InMemoryParticipantRepository } from 'src/playlist/infrastructure/persistence/participant/in-memory-participant.repository';
import { InMemoryTrackRepository } from 'src/playlist/infrastructure/persistence/track/in-memory-track.repository';
import { InMemoryVoteRepository } from 'src/playlist/infrastructure/persistence/vote/in-memory-vote.repository';
import {
  CreatePlaylistInfos,
  Playlist,
} from 'src/playlist/domain/playlist.entity';
import { PlaylistType } from 'src/playlist/domain/playlist-type.enum';
import { Track } from 'src/playlist/domain/track.entity';
import { TrackVote } from 'src/playlist/domain/track-vote.entity';
import { PlaylistNotFound } from 'src/playlist/domain/errors/playlist-not-found.error';
import { NotAVotePlaylist } from 'src/playlist/domain/errors/not-a-vote-playlist.error';
import { NotPlaylistMember } from 'src/playlist/domain/errors/not-playlist-member.error';
import { ListTracksUseCase } from './list-tracks.usecase';

const defaultInfos: CreatePlaylistInfos = {
  id: 'playlist-id',
  type: PlaylistType.VOTE,
  ownerId: 'owner-id',
  name: 'Soirée',
  description: '',
  latitude: 48.8966,
  longitude: 2.3184,
};

describe('ListTracksUseCase', () => {
  let playlistRepository: InMemoryPlaylistRepository;
  let participantRepository: InMemoryParticipantRepository;
  let trackRepository: InMemoryTrackRepository;
  let voteRepository: InMemoryVoteRepository;
  let useCase: ListTracksUseCase;

  async function givenPlaylist(overrides: Partial<CreatePlaylistInfos> = {}) {
    const playlist = Playlist.create({ ...defaultInfos, ...overrides });
    await playlistRepository.save(playlist);
  }

  async function givenTrack(id: string, addedAt: string) {
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
      addedAt: new Date(addedAt),
    });
    await trackRepository.save(track);
    return track;
  }

  async function givenVote(trackId: string, accountId: string) {
    const vote = TrackVote.create({ trackId, accountId });
    await voteRepository.add(vote);
  }

  beforeEach(() => {
    playlistRepository = new InMemoryPlaylistRepository();
    participantRepository = new InMemoryParticipantRepository();
    trackRepository = new InMemoryTrackRepository();
    voteRepository = new InMemoryVoteRepository();
    useCase = new ListTracksUseCase(
      playlistRepository,
      participantRepository,
      trackRepository,
      voteRepository,
    );
  });

  it('returns the tracks ranked by votes', async () => {
    await givenPlaylist();
    await givenTrack('first', '2026-06-15T20:00:00Z');
    await givenTrack('second', '2026-06-15T20:05:00Z');
    await givenVote('second', 'voter-a');
    await givenVote('second', 'voter-b');
    await givenVote('first', 'voter-a');

    const { tracks } = await useCase.execute({
      playlistId: 'playlist-id',
      accountId: 'owner-id',
    });

    const ranking = tracks.map((track) => ({
      id: track.id,
      votes: track.votes,
    }));
    expect(ranking).toEqual([
      { id: 'second', votes: 2 },
      { id: 'first', votes: 1 },
    ]);
  });

  it('tells the caller which tracks they voted for', async () => {
    await givenPlaylist();
    await givenTrack('first', '2026-06-15T20:00:00Z');
    await givenTrack('second', '2026-06-15T20:05:00Z');
    await givenVote('first', 'voter-a');

    const { tracks } = await useCase.execute({
      playlistId: 'playlist-id',
      accountId: 'voter-a',
    });

    const votedTracks = tracks.map((track) => ({
      id: track.id,
      hasVoted: track.hasVoted,
    }));
    expect(votedTracks).toEqual([
      { id: 'first', hasVoted: true },
      { id: 'second', hasVoted: false },
    ]);
  });

  it('does not return played tracks', async () => {
    await givenPlaylist();
    const playedTrack = await givenTrack('played', '2026-06-15T20:00:00Z');
    playedTrack.markAsPlayed();
    await trackRepository.save(playedTrack);
    await givenTrack('waiting', '2026-06-15T20:05:00Z');

    const { tracks } = await useCase.execute({
      playlistId: 'playlist-id',
      accountId: 'owner-id',
    });

    const trackIds = tracks.map((track) => track.id);
    expect(trackIds).toEqual(['waiting']);
  });

  it('lets anyone read a public playlist', async () => {
    await givenPlaylist();

    const { tracks } = await useCase.execute({
      playlistId: 'playlist-id',
      accountId: 'stranger-id',
    });

    expect(tracks).toEqual([]);
  });

  it('does not let a non member read a private playlist', async () => {
    await givenPlaylist({ isPrivate: true });

    await expect(
      useCase.execute({ playlistId: 'playlist-id', accountId: 'stranger-id' }),
    ).rejects.toThrow(NotPlaylistMember);
  });

  it('rejects an editor playlist', async () => {
    await givenPlaylist({ type: PlaylistType.EDITOR });

    await expect(
      useCase.execute({ playlistId: 'playlist-id', accountId: 'owner-id' }),
    ).rejects.toThrow(NotAVotePlaylist);
  });

  it('rejects an unknown playlist', async () => {
    await expect(
      useCase.execute({ playlistId: 'unknown-id', accountId: 'owner-id' }),
    ).rejects.toThrow(PlaylistNotFound);
  });
});
