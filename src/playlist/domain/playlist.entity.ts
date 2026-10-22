import { PLAYLIST_ZONE_RADIUS_METERS } from 'src/shared/constants';
import { InvalidPlaylistPeriod } from './errors/invalid-playlist-period.error';
import { Coordinates, distanceInMeters } from './geo';
import { PlaylistType } from './playlist-type.enum';

export type CreatePlaylistInfos = {
  id: string;
  type: PlaylistType;
  ownerId: string;
  name: string;
  description: string;
  isPrivate?: boolean;
  beginAt?: Date | null;
  endAt?: Date | null;
  latitude: number;
  longitude: number;
};

export class Playlist {
  constructor(
    public readonly id: string,
    public readonly type: PlaylistType,
    public readonly ownerId: string,
    public name: string,
    public description: string,
    public isPrivate: boolean,
    public beginAt: Date | null,
    public endAt: Date | null,
    public latitude: number,
    public longitude: number,
    public coverPath: string | null,
  ) {}

  static create(infos: CreatePlaylistInfos): Playlist {
    if (infos.beginAt && infos.endAt && infos.endAt <= infos.beginAt) {
      throw new InvalidPlaylistPeriod();
    }

    return new Playlist(
      infos.id,
      infos.type,
      infos.ownerId,
      infos.name,
      infos.description,
      infos.isPrivate ?? false,
      infos.beginAt ?? null,
      infos.endAt ?? null,
      infos.latitude,
      infos.longitude,
      null,
    );
  }

  isOwner(accountId: string): boolean {
    return this.ownerId === accountId;
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

  isWithinZone(position: Coordinates): boolean {
    return distanceInMeters(this, position) <= PLAYLIST_ZONE_RADIUS_METERS;
  }
}
