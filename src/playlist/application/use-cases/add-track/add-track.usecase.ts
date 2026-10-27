import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  PLAYLIST_REPOSITORY,
  PlaylistRepository,
} from '../../ports/playlist.repository';
import {
  PARTICIPANT_REPOSITORY,
  ParticipantRepository,
} from '../../ports/participant.repository';
import {
  TRACK_REPOSITORY,
  TrackRepository,
} from '../../ports/track.repository';
import { MUSIC_CATALOG, MusicCatalog } from '../../ports/music-catalog';
import {
  PLAYLIST_EVENT_BUS,
  PlaylistEventBus,
} from '../../ports/playlist-event-bus';
import {
  PLAYLIST_EDIT_LOCK,
  PlaylistEditLock,
} from '../../ports/playlist-edit-lock';
import { toEditorTrackView, toVoteTrackView } from '../../track-view';
import { AddTrackInput, AddTrackOutput } from './add-track.contracts';
import { MusicInfos, Track } from 'src/playlist/domain/track.entity';
import { Playlist } from 'src/playlist/domain/playlist.entity';
import { throwIfCannotActOnTracks } from 'src/playlist/domain/playlist-permissions';
import {
  positionBetween,
  positionOf,
  sortByPosition,
} from 'src/playlist/domain/track-ordering';
import { PLAYLIST_MAX_TRACKS } from 'src/shared/constants';
import { PlaylistNotFound } from 'src/playlist/domain/errors/playlist-not-found.error';
import { MusicNotFound } from 'src/playlist/domain/errors/music-not-found.error';
import { TrackAlreadyInPlaylist } from 'src/playlist/domain/errors/track-already-in-playlist.error';
import { PlaylistFull } from 'src/playlist/domain/errors/playlist-full.error';

@Injectable()
export class AddTrackUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: PlaylistRepository,
    @Inject(PARTICIPANT_REPOSITORY)
    private readonly participantRepository: ParticipantRepository,
    @Inject(TRACK_REPOSITORY)
    private readonly trackRepository: TrackRepository,
    @Inject(MUSIC_CATALOG)
    private readonly musicCatalog: MusicCatalog,
    @Inject(PLAYLIST_EVENT_BUS)
    private readonly eventBus: PlaylistEventBus,
    @Inject(PLAYLIST_EDIT_LOCK)
    private readonly editLock: PlaylistEditLock,
  ) {}

  async execute(input: AddTrackInput): Promise<AddTrackOutput> {
    const playlist = await this.playlistRepository.findById(input.playlistId);
    if (!playlist) {
      throw new PlaylistNotFound();
    }

    const participant =
      await this.participantRepository.findByPlaylistAndAccount({
        playlistId: playlist.id,
        accountId: input.accountId,
      });
    throwIfCannotActOnTracks(
      playlist,
      input.accountId,
      participant,
      input.position,
    );

    const pendingTrack =
      await this.trackRepository.findUnplayedByPlaylistAndVideo({
        playlistId: playlist.id,
        videoId: input.videoId,
      });
    if (pendingTrack) {
      throw new TrackAlreadyInPlaylist();
    }

    // Outside of the lock: it is the only call that leaves our own database
    const music = await this.musicCatalog.findByVideoId(input.videoId);
    if (!music) {
      throw new MusicNotFound();
    }

    // The limit and the last position are read then written: one edit at a time
    const track = await this.editLock.runExclusively(playlist.id, () =>
      this.addToPlaylist(playlist, music, input.accountId),
    );

    return {
      trackId: track.id,
    };
  }

  private async addToPlaylist(
    playlist: Playlist,
    music: MusicInfos,
    accountId: string,
  ): Promise<Track> {
    const trackCount = await this.trackRepository.countUnplayedByPlaylist(
      playlist.id,
    );
    if (trackCount >= PLAYLIST_MAX_TRACKS) {
      throw new PlaylistFull();
    }

    if (playlist.isEditorPlaylist()) {
      return await this.appendToEditorPlaylist(playlist, music, accountId);
    }

    const track = Track.create({
      id: randomUUID(),
      playlistId: playlist.id,
      music,
      addedBy: accountId,
      addedAt: new Date(),
    });
    await this.trackRepository.save(track);

    this.eventBus.publish({
      type: 'track.added',
      playlistId: playlist.id,
      track: toVoteTrackView(track, 0),
      afterTrackId: null,
    });
    return track;
  }

  // A new track always goes at the end of an EDITOR playlist
  private async appendToEditorPlaylist(
    playlist: Playlist,
    music: MusicInfos,
    accountId: string,
  ): Promise<Track> {
    const tracks = await this.trackRepository.findUnplayedByPlaylist(
      playlist.id,
    );
    const orderedTracks = sortByPosition(tracks);
    const lastTrack = orderedTracks.at(-1) ?? null;
    const lastPosition = lastTrack === null ? null : positionOf(lastTrack);

    const track = Track.create({
      id: randomUUID(),
      playlistId: playlist.id,
      music,
      addedBy: accountId,
      addedAt: new Date(),
      position: positionBetween(lastPosition, null),
    });
    await this.trackRepository.save(track);

    this.eventBus.publish({
      type: 'track.added',
      playlistId: playlist.id,
      track: toEditorTrackView(track),
      afterTrackId: lastTrack === null ? null : lastTrack.id,
    });
    return track;
  }
}
