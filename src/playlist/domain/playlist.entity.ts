import { PLAYLIST_ZONE_RADIUS_METERS } from 'src/shared/constants';
import { InvalidPlaylistPeriod } from './errors/invalid-playlist-period.error';
import { LocationNotAllowed } from './errors/location-not-allowed.error';
import { LocationRequired } from './errors/location-required.error';
import { Coordinates, distanceInMeters } from './geo';
import { PlaylistType } from './playlist-type.enum';
import { PlaylistLicense } from './playlist-license.enum';

export type CreatePlaylistInfos = {
  id: string;
  type: PlaylistType;
  ownerId: string;
  name: string;
  description: string;
  isPrivate?: boolean;
  license?: PlaylistLicense;
  beginAt?: Date | null;
  endAt?: Date | null;
  // Required for a VOTE playlist (participants must be on site), forbidden for
  // an EDITOR playlist (remote collaboration)
  latitude?: number | null;
  longitude?: number | null;
};

export class Playlist {
  constructor(
    public readonly id: string,
    public readonly type: PlaylistType,
    public readonly ownerId: string,
    public name: string,
    public description: string,
    public isPrivate: boolean,
    public license: PlaylistLicense,
    public beginAt: Date | null,
    public endAt: Date | null,
    // null for an EDITOR playlist
    public latitude: number | null,
    public longitude: number | null,
    public coverPath: string | null,
  ) {}

  static create(infos: CreatePlaylistInfos): Playlist {
    if (infos.beginAt && infos.endAt && infos.endAt <= infos.beginAt) {
      throw new InvalidPlaylistPeriod();
    }
    Playlist.throwIfInvalidLocation(infos);

    return new Playlist(
      infos.id,
      infos.type,
      infos.ownerId,
      infos.name,
      infos.description,
      infos.isPrivate ?? false,
      infos.license ?? PlaylistLicense.EVERYONE,
      infos.beginAt ?? null,
      infos.endAt ?? null,
      infos.latitude ?? null,
      infos.longitude ?? null,
      null,
    );
  }

  private static throwIfInvalidLocation(infos: CreatePlaylistInfos): void {
    const hasLatitude = infos.latitude !== undefined && infos.latitude !== null;
    const hasLongitude =
      infos.longitude !== undefined && infos.longitude !== null;

    if (infos.type === PlaylistType.EDITOR) {
      if (hasLatitude || hasLongitude) {
        throw new LocationNotAllowed();
      }
      return;
    }
    if (!hasLatitude || !hasLongitude) {
      throw new LocationRequired();
    }
  }

  isOwner(accountId: string): boolean {
    return this.ownerId === accountId;
  }

  isVotePlaylist(): boolean {
    return this.type === PlaylistType.VOTE;
  }

  isEditorPlaylist(): boolean {
    return this.type === PlaylistType.EDITOR;
  }

  hasBegun(now: Date = new Date()): boolean {
    if (this.beginAt === null) {
      return true;
    }
    return now >= this.beginAt;
  }

  hasEnded(now: Date = new Date()): boolean {
    if (this.endAt === null) {
      return false;
    }
    return now >= this.endAt;
  }

  isActive(now: Date = new Date()): boolean {
    return this.hasBegun(now) && !this.hasEnded(now);
  }

  // A playlist without location (EDITOR) has no zone to be in
  isWithinZone(position: Coordinates): boolean {
    if (this.latitude === null || this.longitude === null) {
      return false;
    }
    const location: Coordinates = {
      latitude: this.latitude,
      longitude: this.longitude,
    };
    return distanceInMeters(location, position) <= PLAYLIST_ZONE_RADIUS_METERS;
  }
}
