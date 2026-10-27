import { Inject, Injectable } from '@nestjs/common';
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
import {
  PLAYLIST_EVENT_BUS,
  PlaylistEventBus,
} from '../../ports/playlist-event-bus';
import {
  PLAYLIST_EDIT_LOCK,
  PlaylistEditLock,
} from '../../ports/playlist-edit-lock';
import { MoveTrackInput, MoveTrackOutput } from './move-track.contracts';
import { Track } from 'src/playlist/domain/track.entity';
import { throwIfCannotActOnTracks } from 'src/playlist/domain/playlist-permissions';
import {
  hasRoomBetween,
  positionBetween,
  positionOf,
  renumber,
  sortByPosition,
} from 'src/playlist/domain/track-ordering';
import { PlaylistNotFound } from 'src/playlist/domain/errors/playlist-not-found.error';
import { NotAnEditorPlaylist } from 'src/playlist/domain/errors/not-an-editor-playlist.error';
import { InvalidMove } from 'src/playlist/domain/errors/invalid-move.error';
import { TrackNotFound } from 'src/playlist/domain/errors/track-not-found.error';

type Neighbours = {
  previous: Track | null;
  next: Track | null;
};

@Injectable()
export class MoveTrackUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: PlaylistRepository,
    @Inject(PARTICIPANT_REPOSITORY)
    private readonly participantRepository: ParticipantRepository,
    @Inject(TRACK_REPOSITORY)
    private readonly trackRepository: TrackRepository,
    @Inject(PLAYLIST_EVENT_BUS)
    private readonly eventBus: PlaylistEventBus,
    @Inject(PLAYLIST_EDIT_LOCK)
    private readonly editLock: PlaylistEditLock,
  ) {}

  async execute(input: MoveTrackInput): Promise<MoveTrackOutput> {
    const playlist = await this.playlistRepository.findById(input.playlistId);
    if (!playlist) {
      throw new PlaylistNotFound();
    }
    if (!playlist.isEditorPlaylist()) {
      throw new NotAnEditorPlaylist();
    }

    // EDITOR: no position needed, the collaboration happens remotely
    const participant =
      await this.participantRepository.findByPlaylistAndAccount({
        playlistId: playlist.id,
        accountId: input.accountId,
      });
    throwIfCannotActOnTracks(playlist, input.accountId, participant, null);

    if (input.afterTrackId === input.trackId) {
      throw new InvalidMove();
    }

    // Reads the neighbours then writes: one edit of this playlist at a time
    const version = await this.editLock.runExclusively(playlist.id, () =>
      this.moveTrack(input),
    );

    return {
      version,
    };
  }

  private async moveTrack(input: MoveTrackInput): Promise<number> {
    const tracks = await this.trackRepository.findUnplayedByPlaylist(
      input.playlistId,
    );
    const orderedTracks = sortByPosition(tracks);

    const track = orderedTracks.find(
      (candidate) => candidate.id === input.trackId,
    );
    if (!track) {
      throw new TrackNotFound();
    }

    // The neighbours are computed without the moved track
    const otherTracks = orderedTracks.filter(
      (candidate) => candidate.id !== track.id,
    );
    let neighbours = this.findNeighbours(otherTracks, input.afterTrackId);
    let previousPosition = this.positionOrNull(neighbours.previous);
    let nextPosition = this.positionOrNull(neighbours.next);

    if (!hasRoomBetween(previousPosition, nextPosition)) {
      await this.renumberPlaylist(otherTracks);
      neighbours = this.findNeighbours(otherTracks, input.afterTrackId);
      previousPosition = this.positionOrNull(neighbours.previous);
      nextPosition = this.positionOrNull(neighbours.next);
    }

    // Fails early if the client is based on an outdated version of the track
    const newPosition = positionBetween(previousPosition, nextPosition);
    track.moveTo(newPosition, input.version);

    // Fails if the version changed in the database in the meantime
    await this.trackRepository.updatePosition({
      trackId: track.id,
      position: newPosition,
      expectedVersion: input.version,
    });

    this.eventBus.publish({
      type: 'track.moved',
      playlistId: input.playlistId,
      trackId: track.id,
      afterTrackId: input.afterTrackId,
      version: track.version,
    });

    return track.version;
  }

  private findNeighbours(
    orderedTracks: Track[],
    afterTrackId: string | null,
  ): Neighbours {
    if (afterTrackId === null) {
      return {
        previous: null,
        next: orderedTracks[0] ?? null,
      };
    }

    const anchorIndex = orderedTracks.findIndex(
      (candidate) => candidate.id === afterTrackId,
    );
    if (anchorIndex === -1) {
      throw new TrackNotFound();
    }
    return {
      previous: orderedTracks[anchorIndex],
      next: orderedTracks[anchorIndex + 1] ?? null,
    };
  }

  private positionOrNull(track: Track | null): number | null {
    if (track === null) {
      return null;
    }
    return positionOf(track);
  }

  // Rare: only after many moves at the same place. The order does not change.
  private async renumberPlaylist(orderedTracks: Track[]): Promise<void> {
    renumber(orderedTracks);
    for (const track of orderedTracks) {
      await this.trackRepository.save(track);
    }
  }
}
