import { Track } from 'src/playlist/domain/track.entity';

// What clients see of a track, in the lists and in the real-time events

type TrackBaseView = {
  id: string;
  videoId: string;
  name: string;
  artist: string;
  thumbnail: string | null;
  duration: number | null;
  addedBy: string;
  addedAt: Date;
};

export type VoteTrackView = TrackBaseView & {
  votes: number;
};

// No numeric position: clients only rely on the order of the list
export type EditorTrackView = TrackBaseView & {
  version: number;
};

function toTrackBaseView(track: Track): TrackBaseView {
  return {
    id: track.id,
    videoId: track.videoId,
    name: track.name,
    artist: track.artist,
    thumbnail: track.thumbnail,
    duration: track.duration,
    addedBy: track.addedBy,
    addedAt: track.addedAt,
  };
}

export function toVoteTrackView(track: Track, votes: number): VoteTrackView {
  return {
    ...toTrackBaseView(track),
    votes,
  };
}

export function toEditorTrackView(track: Track): EditorTrackView {
  return {
    ...toTrackBaseView(track),
    version: track.version,
  };
}
