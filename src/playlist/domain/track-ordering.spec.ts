import { Track } from './track.entity';
import {
  hasRoomBetween,
  POSITION_STEP,
  positionBetween,
  renumber,
  sortByPosition,
} from './track-ordering';

function buildTrack(id: string, position: number, addedAt: string) {
  return Track.create({
    id,
    playlistId: 'playlist-id',
    music: {
      videoId: `video-${id}`,
      name: id,
      artist: 'artist',
      thumbnail: null,
      duration: null,
    },
    addedBy: 'author-id',
    addedAt: new Date(addedAt),
    position,
  });
}

function idsOf(tracks: Track[]): string[] {
  return tracks.map((track) => track.id);
}

describe('track ordering', () => {
  describe('positionBetween', () => {
    it('gives the first step to the first track of an empty playlist', () => {
      expect(positionBetween(null, null)).toBe(POSITION_STEP);
    });

    it('places a track after the last one', () => {
      expect(positionBetween(2048, null)).toBe(2048 + POSITION_STEP);
    });

    it('places a track before the first one', () => {
      expect(positionBetween(null, 1024)).toBe(1024 - POSITION_STEP);
    });

    it('places a track in the middle of its two neighbours', () => {
      expect(positionBetween(1024, 2048)).toBe(1536);
    });

    it('always lands strictly between the neighbours', () => {
      const previous = 1024;
      const next = 1025;

      const position = positionBetween(previous, next);

      expect(position).toBeGreaterThan(previous);
      expect(position).toBeLessThan(next);
    });
  });

  describe('hasRoomBetween', () => {
    it('always has room at the edges', () => {
      expect(hasRoomBetween(null, 1024)).toBe(true);
      expect(hasRoomBetween(1024, null)).toBe(true);
      expect(hasRoomBetween(null, null)).toBe(true);
    });

    it('has room between distant positions', () => {
      expect(hasRoomBetween(1024, 2048)).toBe(true);
    });

    it('has no room once the positions are too close', () => {
      expect(hasRoomBetween(1024, 1024 + 1e-9)).toBe(false);
    });

    it('runs out of room after many moves at the same place', () => {
      let previous = 1024;
      const next = 2048;
      let moves = 0;
      while (hasRoomBetween(previous, next)) {
        previous = positionBetween(previous, next);
        moves++;
      }

      // About thirty moves fit between two neighbours before renumbering
      expect(moves).toBeGreaterThan(25);
    });
  });

  describe('sortByPosition', () => {
    it('orders the tracks by position', () => {
      const tracks = [
        buildTrack('third', 3072, '2026-06-15T20:00:00Z'),
        buildTrack('first', 1024, '2026-06-15T20:01:00Z'),
        buildTrack('second', 2048, '2026-06-15T20:02:00Z'),
      ];

      const sortedTracks = sortByPosition(tracks);

      expect(idsOf(sortedTracks)).toEqual(['first', 'second', 'third']);
    });

    it('puts the track added first before on an equal position', () => {
      const tracks = [
        buildTrack('later', 1024, '2026-06-15T20:05:00Z'),
        buildTrack('earlier', 1024, '2026-06-15T20:00:00Z'),
      ];

      const sortedTracks = sortByPosition(tracks);

      expect(idsOf(sortedTracks)).toEqual(['earlier', 'later']);
    });

    it('does not modify the given list', () => {
      const tracks = [
        buildTrack('second', 2048, '2026-06-15T20:00:00Z'),
        buildTrack('first', 1024, '2026-06-15T20:00:00Z'),
      ];

      sortByPosition(tracks);

      expect(idsOf(tracks)).toEqual(['second', 'first']);
    });
  });

  describe('renumber', () => {
    it('spreads the positions again without changing the order', () => {
      const tracks = [
        buildTrack('first', 1024, '2026-06-15T20:00:00Z'),
        buildTrack('second', 1024.0000001, '2026-06-15T20:00:00Z'),
        buildTrack('third', 1024.0000002, '2026-06-15T20:00:00Z'),
      ];

      renumber(tracks);

      const positions = tracks.map((track) => track.position);
      expect(positions).toEqual([
        POSITION_STEP,
        2 * POSITION_STEP,
        3 * POSITION_STEP,
      ]);
    });

    it('does not change the versions', () => {
      const tracks = [buildTrack('first', 1024, '2026-06-15T20:00:00Z')];

      renumber(tracks);

      expect(tracks[0].version).toBe(1);
    });
  });
});
