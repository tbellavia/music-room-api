import { PlaylistType } from 'src/playlist/domain/playlist-type.enum';

export type CreatePlaylistInput = {
  ownerId: string;
  type: PlaylistType;
  name: string;
  description: string;
  isPrivate?: boolean;
  beginAt?: Date;
  endAt?: Date;
  latitude: number;
  longitude: number;
};

export type CreatePlaylistOutput = {
  id: string;
};
