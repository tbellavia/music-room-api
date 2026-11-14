import { CreatePlaylistInfos } from './playlist.entity';
import { PlaylistType } from './playlist-type.enum';

// Test helper: the spec defaults are a VOTE playlist with a location and an address. When a
// test overrides the type to EDITOR, the location is removed, since an EDITOR
// playlist has none.
export function playlistInfos(
  defaults: CreatePlaylistInfos,
  overrides: Partial<CreatePlaylistInfos>,
): CreatePlaylistInfos {
  const infos = { ...defaults, ...overrides };
  if (infos.type === PlaylistType.EDITOR) {
    infos.latitude = null;
    infos.longitude = null;
    infos.address = null;
  }
  return infos;
}
