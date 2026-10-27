import { Track } from './track.entity';

// Fractional positions: a track moved between A and B gets (A + B) / 2,
// the other tracks never move. Positions are spaced by POSITION_STEP so that
// many moves fit between two neighbours before a renumbering is needed.
export const POSITION_STEP = 1024;

// Below this gap two positions can no longer be told apart reliably
const MIN_POSITION_GAP = 1e-6;

// `previous` / `next`: positions of the neighbours of the slot, null at the edges
export function positionBetween(
  previous: number | null,
  next: number | null,
): number {
  if (previous === null) {
    // Empty playlist, or placed first
    return next === null ? POSITION_STEP : next - POSITION_STEP;
  }
  if (next === null) {
    // Placed last
    return previous + POSITION_STEP;
  }
  return (previous + next) / 2;
}

export function hasRoomBetween(
  previous: number | null,
  next: number | null,
): boolean {
  if (previous === null || next === null) {
    return true;
  }
  return next - previous > MIN_POSITION_GAP;
}

// An EDITOR track always has a position, a missing one is a bug
export function positionOf(track: Track): number {
  if (track.position === null) {
    throw new Error(`Track ${track.id} has no position`);
  }
  return track.position;
}

// Playlist order; on an equal position, the track added first comes first
export function sortByPosition(tracks: Track[]): Track[] {
  const sortedTracks = [...tracks];
  sortedTracks.sort((first, second) => {
    const positionDifference = positionOf(first) - positionOf(second);
    if (positionDifference !== 0) {
      return positionDifference;
    }
    return first.addedAt.getTime() - second.addedAt.getTime();
  });
  return sortedTracks;
}

// Spreads the positions again, same order: 1 * STEP, 2 * STEP, ...
export function renumber(orderedTracks: Track[]): void {
  orderedTracks.forEach((track, index) => {
    track.renumberTo((index + 1) * POSITION_STEP);
  });
}
