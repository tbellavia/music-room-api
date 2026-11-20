import { Coordinates } from 'src/playlist/domain/geo';
import { ListedPlaylist } from 'src/playlist/application/listed-playlist';

export type ListPublicEventsInput = {
  accountId: string;
  // With a position: the closest VOTE events. Without: the soonest events.
  position: Coordinates | null;
};

export type ListPublicEventsOutput = {
  // beginAt is never null: an event has a beginning date
  playlists: ListedPlaylist[];
};
