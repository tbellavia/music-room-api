// Runs the edits of one playlist one after the other. Computing a position
// reads the neighbours then writes: two edits of the same playlist must not
// interleave. Edits of different playlists still run in parallel.
export interface PlaylistEditLock {
  runExclusively<T>(playlistId: string, work: () => Promise<T>): Promise<T>;
}

export const PLAYLIST_EDIT_LOCK = Symbol('PlaylistEditLock');
