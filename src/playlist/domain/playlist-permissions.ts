import { Coordinates } from './geo';
import { OutsidePlaylistZone } from './errors/outside-playlist-zone.error';
import { PlaylistEnded } from './errors/playlist-ended.error';
import { PlaylistNotStarted } from './errors/playlist-not-started.error';
import { Participant } from './participant.entity';
import { Playlist } from './playlist.entity';

// Who may do what on a playlist. The owner has no participant row:
// `participant` is the caller's participant row, or null if they have none.

export function isMember(
  playlist: Playlist,
  accountId: string,
  participant: Participant | null,
): boolean {
  return playlist.isOwner(accountId) || participant !== null;
}

export function canInvite(
  playlist: Playlist,
  accountId: string,
  participant: Participant | null,
): boolean {
  if (playlist.isOwner(accountId)) {
    return true;
  }
  return participant !== null && participant.hasPrivilege;
}

export function canManageParticipants(
  playlist: Playlist,
  accountId: string,
): boolean {
  return playlist.isOwner(accountId);
}

// A participant can only act on the tracks of a playlist (add, delete, vote)
// while it is running and while they are on site. A missing position counts
// as being outside the zone. It does not apply to invitations.
export function throwIfParticipantCannotOperate(
  playlist: Playlist,
  position: Coordinates | null,
  now: Date = new Date(),
): void {
  if (playlist.hasEnded(now)) {
    throw new PlaylistEnded();
  }
  if (!playlist.hasBegun(now)) {
    throw new PlaylistNotStarted();
  }
  if (position === null || !playlist.isWithinZone(position)) {
    throw new OutsidePlaylistZone();
  }
}
