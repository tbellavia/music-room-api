import { PlaylistType } from 'src/playlist/domain/playlist-type.enum';
import { PlaylistLicense } from 'src/playlist/domain/playlist-license.enum';

export type CreatePlaylistInput = {
  ownerId: string;
  type: PlaylistType;
  name: string;
  description: string;
  isPrivate?: boolean;
  license?: PlaylistLicense;
  beginAt?: Date;
  endAt?: Date;
  latitude: number;
  longitude: number;
};

export type CreatePlaylistOutput = {
  id: string;
};
