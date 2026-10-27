export type MoveTrackInput = {
  playlistId: string;
  trackId: string;
  accountId: string;
  // The track to place it after, null to place it first. Relative to a track
  // and not an index: an index is wrong as soon as someone else moves a track.
  afterTrackId: string | null;
  // Version of the track the client based its decision on
  version: number;
};

export type MoveTrackOutput = {
  version: number;
};
