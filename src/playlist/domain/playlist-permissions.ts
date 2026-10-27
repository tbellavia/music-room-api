import { Coordinates } from './geo';
import { OutsidePlaylistZone } from './errors/outside-playlist-zone.error';
import { PlaylistEnded } from './errors/playlist-ended.error';
import { PlaylistNotStarted } from './errors/playlist-not-started.error';
import { NotPlaylistMember } from './errors/not-playlist-member.error';
import { TrackActionForbidden } from './errors/track-action-forbidden.error';
import { TrackDeleteForbidden } from './errors/track-delete-forbidden.error';
import { Participant } from './participant.entity';
import { Playlist } from './playlist.entity';
import { Track } from './track.entity';
import { PlaylistLicense } from './playlist-license.enum';

// Who may do what on a playlist. The owner has no participant row:
// `participant` is the caller's participant row, or null if they have none.

export function isMember(
  playlist: Playlist,
  accountId: string,
  participant: Participant | null,
): boolean {
  return playlist.isOwner(accountId) || participant !== null;
}

// A public playlist can be read by anyone, a private one by its members only
export function canRead(
  playlist: Playlist,
  accountId: string,
  participant: Participant | null,
): boolean {
  if (!playlist.isPrivate) {
    return true;
  }
  return isMember(playlist, accountId, participant);
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

// The license decides which members can add tracks and vote
export function canActOnTracks(
  playlist: Playlist,
  accountId: string,
  participant: Participant | null,
): boolean {
  if (playlist.isOwner(accountId)) {
    return true;
  }
  if (participant === null) {
    return false;
  }
  if (playlist.license === PlaylistLicense.EVERYONE) {
    return true;
  }
  return participant.wasInvited();
}

// Owner and privileged participants; in an EDITOR playlist, the author too
export function canDeleteTrack(
  playlist: Playlist,
  accountId: string,
  participant: Participant | null,
  track: Track,
): boolean {
  if (playlist.isOwner(accountId)) {
    return true;
  }
  if (participant === null) {
    return false;
  }
  if (participant.hasPrivilege) {
    return true;
  }
  return playlist.isEditorPlaylist() && track.isAddedBy(accountId);
}

// A participant of a VOTE playlist can only act on its tracks (add, delete,
// vote) while it is running and while they are on site. A missing position
// counts as being outside the zone. It does not apply to invitations.
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

// Add a track, vote, withdraw a vote (VOTE) or move a track (EDITOR)
export function throwIfCannotActOnTracks(
  playlist: Playlist,
  accountId: string,
  participant: Participant | null,
  position: Coordinates | null,
  now: Date = new Date(),
): void {
  if (!isMember(playlist, accountId, participant)) {
    throw new NotPlaylistMember();
  }
  if (!canActOnTracks(playlist, accountId, participant)) {
    throw new TrackActionForbidden();
  }
  throwIfOutsideOfPlaylist(playlist, accountId, position, now);
}

export function throwIfCannotDeleteTrack(
  playlist: Playlist,
  accountId: string,
  participant: Participant | null,
  track: Track,
  position: Coordinates | null,
  now: Date = new Date(),
): void {
  if (!isMember(playlist, accountId, participant)) {
    throw new NotPlaylistMember();
  }
  if (!canDeleteTrack(playlist, accountId, participant, track)) {
    throw new TrackDeleteForbidden();
  }
  throwIfOutsideOfPlaylist(playlist, accountId, position, now);
}

// Participants of a VOTE playlist must be on site. The owner, and everyone in
// an EDITOR playlist (remote collaboration), act from anywhere, at any time,
// as long as the playlist is not over.
function throwIfOutsideOfPlaylist(
  playlist: Playlist,
  accountId: string,
  position: Coordinates | null,
  now: Date,
): void {
  const mustBeOnSite =
    playlist.isVotePlaylist() && !playlist.isOwner(accountId);
  if (mustBeOnSite) {
    throwIfParticipantCannotOperate(playlist, position, now);
    return;
  }
  if (playlist.hasEnded(now)) {
    throw new PlaylistEnded();
  }
}
