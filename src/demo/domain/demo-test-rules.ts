import { Playlist } from 'src/playlist/domain/playlist.entity';
import { PlaylistType } from 'src/playlist/domain/playlist-type.enum';
import { PlaylistLicense } from 'src/playlist/domain/playlist-license.enum';
import { JoinMethod } from 'src/playlist/domain/join-method.enum';
import { DemoPlaylist } from './demo-data';

// Test helper of the generator spec: the rules of the
// API that the demo data must follow, even though it skips the use cases.
// Returns the broken rules, so that a failing test says which one.
export function demoPlaylistViolations(
  demoPlaylist: DemoPlaylist,
  now: Date,
): string[] {
  const violations: string[] = [];
  const name = demoPlaylist.infos.name;
  const ownerId = demoPlaylist.infos.ownerId;
  const isVote = demoPlaylist.infos.type === PlaylistType.VOTE;
  const isInvitedOnly =
    demoPlaylist.infos.license === PlaylistLicense.INVITED_ONLY;
  const beginAt = demoPlaylist.infos.beginAt ?? null;
  const hasBegun = beginAt === null || beginAt <= now;

  try {
    Playlist.create(demoPlaylist.infos);
  } catch (error) {
    violations.push(`${name}: invalid playlist (${String(error)})`);
  }

  const participantIds = demoPlaylist.participants.map(
    (participant) => participant.accountId,
  );
  const memberIds = [ownerId, ...participantIds];
  if (new Set(memberIds).size !== memberIds.length) {
    violations.push(`${name}: a member is listed twice`);
  }

  for (const participant of demoPlaylist.participants) {
    const hasJoined = participant.joinedVia === JoinMethod.JOIN;
    if (hasJoined && (demoPlaylist.infos.isPrivate === true || !hasBegun)) {
      violations.push(
        `${name}: ${participant.accountId} joined a private or not begun playlist`,
      );
    }
  }

  // Who may add tracks and vote: the license, and before a VOTE party begins,
  // the owner only
  const invitedIds = demoPlaylist.participants
    .filter((participant) => participant.joinedVia === JoinMethod.INVITATION)
    .map((participant) => participant.accountId);
  let actorIds = isInvitedOnly ? [ownerId, ...invitedIds] : memberIds;
  if (isVote && !hasBegun) {
    actorIds = [ownerId];
  }

  const waitingVideoIds: string[] = [];
  for (const track of demoPlaylist.tracks) {
    if (!actorIds.includes(track.addedBy)) {
      violations.push(
        `${name}: ${track.addedBy} cannot add ${track.music.name}`,
      );
    }
    for (const voterId of track.voterIds) {
      if (!actorIds.includes(voterId)) {
        violations.push(
          `${name}: ${voterId} cannot vote for ${track.music.name}`,
        );
      }
    }
    if (new Set(track.voterIds).size !== track.voterIds.length) {
      violations.push(
        `${name}: an account votes twice for ${track.music.name}`,
      );
    }
    if (track.addedAt > now) {
      violations.push(`${name}: ${track.music.name} is added in the future`);
    }
    if (!isVote && (track.playedAt !== null || track.voterIds.length > 0)) {
      violations.push(
        `${name}: ${track.music.name} is played or voted in an EDITOR playlist`,
      );
    }
    if (track.playedAt === null) {
      waitingVideoIds.push(track.music.videoId);
    }
  }
  if (new Set(waitingVideoIds).size !== waitingVideoIds.length) {
    violations.push(`${name}: a music waits twice`);
  }

  const privilegedIds = demoPlaylist.participants
    .filter((participant) => participant.hasPrivilege)
    .map((participant) => participant.accountId);
  const inviterIds = [ownerId, ...privilegedIds];
  const inviteeIds = demoPlaylist.invitations.map(
    (invitation) => invitation.inviteeId,
  );
  if (new Set(inviteeIds).size !== inviteeIds.length) {
    violations.push(`${name}: an account is invited twice`);
  }
  for (const invitation of demoPlaylist.invitations) {
    if (!inviterIds.includes(invitation.inviterId)) {
      violations.push(`${name}: ${invitation.inviterId} cannot invite`);
    }
    if (memberIds.includes(invitation.inviteeId)) {
      violations.push(
        `${name}: ${invitation.inviteeId} is invited but already a member`,
      );
    }
  }

  return violations;
}
