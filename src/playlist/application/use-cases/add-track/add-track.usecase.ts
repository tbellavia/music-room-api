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
import { toTrackView } from '../../track-view';
import { AddTrackInput, AddTrackOutput } from './add-track.contracts';
import { Track } from 'src/playlist/domain/track.entity';
import { throwIfCannotActOnTracks } from 'src/playlist/domain/playlist-permissions';
import { PlaylistNotFound } from 'src/playlist/domain/errors/playlist-not-found.error';
import { NotAVotePlaylist } from 'src/playlist/domain/errors/not-a-vote-playlist.error';
import { MusicNotFound } from 'src/playlist/domain/errors/music-not-found.error';
import { TrackAlreadyInPlaylist } from 'src/playlist/domain/errors/track-already-in-playlist.error';

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
  ) {}

  async execute(input: AddTrackInput): Promise<AddTrackOutput> {
    const playlist = await this.playlistRepository.findById(input.playlistId);
    if (!playlist) {
      throw new PlaylistNotFound();
    }
    if (!playlist.isVotePlaylist()) {
      throw new NotAVotePlaylist();
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

    // Asked last: it is the only call that leaves our own database
    const music = await this.musicCatalog.findByVideoId(input.videoId);
    if (!music) {
      throw new MusicNotFound();
    }

    const track = Track.create({
      id: randomUUID(),
      playlistId: playlist.id,
      music,
      addedBy: input.accountId,
      addedAt: new Date(),
    });
    await this.trackRepository.save(track);

    this.eventBus.publish({
      type: 'track.added',
      playlistId: playlist.id,
      track: toTrackView(track, 0),
    });

    return {
      trackId: track.id,
    };
  }
}
