import { Coordinates } from 'src/playlist/domain/geo';
import { PlaylistType } from 'src/playlist/domain/playlist-type.enum';
import { PlaylistLicense } from 'src/playlist/domain/playlist-license.enum';
import { PlaylistStatus } from 'src/playlist/domain/playlist-status.enum';

export type ListPublicEventsInput = {
  accountId: string;
  // With a position: the closest VOTE events. Without: the soonest events.
  position: Coordinates | null;
};

export type PublicEvent = {
  id: string;
  type: PlaylistType;
  license: PlaylistLicense;
  ownerId: string;
  ownerUsername: string | null;
  name: string;
  description: string;
  // Never null: an event has a beginning date
  beginAt: Date | null;
  endAt: Date | null;
  // null for an EDITOR playlist
  latitude: number | null;
  longitude: number | null;
  coverPath: string | null;
  status: PlaylistStatus;
  // Rounded to the meter, null without position
  distanceMeters: number | null;
  canJoinHere: boolean;
};

export type ListPublicEventsOutput = {
  events: PublicEvent[];
};
