import { Track } from 'src/playlist/domain/track.entity';

// What clients see of a track, in the ranking and in the real-time events
export type TrackView = {
  id: string;
  videoId: string;
  name: string;
  artist: string;
  thumbnail: string | null;
  duration: number | null;
  addedBy: string;
  addedAt: Date;
  votes: number;
};

export function toTrackView(track: Track, votes: number): TrackView {
  return {
    id: track.id,
    videoId: track.videoId,
    name: track.name,
    artist: track.artist,
    thumbnail: track.thumbnail,
    duration: track.duration,
    addedBy: track.addedBy,
    addedAt: track.addedAt,
    votes,
  };
}
