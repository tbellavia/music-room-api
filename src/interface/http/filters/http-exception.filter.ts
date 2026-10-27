import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { AccountAlreadyExistsError } from 'src/identity/domain/errors/account-already-exists.error';
import { AccountNotFound } from 'src/identity/domain/errors/account-not-found.error';
import { Unauthorized } from 'src/identity/domain/errors/unauthorized.error';
import { AlreadyParticipant } from 'src/playlist/domain/errors/already-participant.error';
import { OutsidePlaylistZone } from 'src/playlist/domain/errors/outside-playlist-zone.error';
import { PlaylistEnded } from 'src/playlist/domain/errors/playlist-ended.error';
import { PlaylistEndInPast } from 'src/playlist/domain/errors/playlist-end-in-past.error';
import { PlaylistNotStarted } from 'src/playlist/domain/errors/playlist-not-started.error';
import { PlaylistNotFound } from 'src/playlist/domain/errors/playlist-not-found.error';
import { PrivatePlaylist } from 'src/playlist/domain/errors/private-playlist.error';
import { InvalidPlaylistPeriod } from 'src/playlist/domain/errors/invalid-playlist-period.error';
import { PlaylistAlreadyExists } from 'src/playlist/domain/errors/playlist-already-exists.error';
import { InvitationForbidden } from 'src/playlist/domain/errors/invitation-forbidden.error';
import { NotPlaylistOwner } from 'src/playlist/domain/errors/not-playlist-owner.error';
import { NotPlaylistMember } from 'src/playlist/domain/errors/not-playlist-member.error';
import { InviteeNotFound } from 'src/playlist/domain/errors/invitee-not-found.error';
import { InvitationNotFound } from 'src/playlist/domain/errors/invitation-not-found.error';
import { ParticipantNotFound } from 'src/playlist/domain/errors/participant-not-found.error';
import { InvitationAlreadyExists } from 'src/playlist/domain/errors/invitation-already-exists.error';
import { NotAVotePlaylist } from 'src/playlist/domain/errors/not-a-vote-playlist.error';
import { TrackActionForbidden } from 'src/playlist/domain/errors/track-action-forbidden.error';
import { TrackDeleteForbidden } from 'src/playlist/domain/errors/track-delete-forbidden.error';
import { CannotVoteOwnTrack } from 'src/playlist/domain/errors/cannot-vote-own-track.error';
import { MusicNotFound } from 'src/playlist/domain/errors/music-not-found.error';
import { TrackNotFound } from 'src/playlist/domain/errors/track-not-found.error';
import { VoteNotFound } from 'src/playlist/domain/errors/vote-not-found.error';
import { TrackAlreadyInPlaylist } from 'src/playlist/domain/errors/track-already-in-playlist.error';
import { AlreadyVoted } from 'src/playlist/domain/errors/already-voted.error';
import { TrackAlreadyPlayed } from 'src/playlist/domain/errors/track-already-played.error';
import { PLAYLIST_ZONE_RADIUS_METERS } from 'src/shared/constants';
import { FriendshipAlreadyExists } from 'src/social/domain/errors/friendship-already-exists.error';
import { FriendshipRequestAlreadyExists } from 'src/social/domain/errors/friendship-request-already-exists.error';
import { FriendshipRequestNotFound } from 'src/social/domain/errors/friendship-request-not-found.error';
import { SelfFriendshipRequestError } from 'src/social/domain/errors/self-friendship-request.error';
import { SelfFriendshipError } from 'src/social/domain/errors/self-friendship.error';
import { UnknownFriendshipRequest } from 'src/social/domain/errors/unknown-friendship-request';

type ErrorResponse = {
  status: number;
  error: string;
  message: string;
};

// Every domain error must be registered here, otherwise it ends up as a 500
const DOMAIN_ERRORS = new Map<unknown, ErrorResponse>([
  // identity
  [
    AccountAlreadyExistsError,
    {
      status: 409,
      error: 'ACCOUNT_ALREADY_EXISTS',
      message: 'Account already exists',
    },
  ],
  // Same response for both, so login does not reveal which usernames exist
  [
    AccountNotFound,
    {
      status: 401,
      error: 'INVALID_CREDENTIALS',
      message: 'Invalid credentials',
    },
  ],
  [
    Unauthorized,
    {
      status: 401,
      error: 'INVALID_CREDENTIALS',
      message: 'Invalid credentials',
    },
  ],
  // social
  [
    FriendshipAlreadyExists,
    {
      status: 409,
      error: 'FRIENDSHIP_ALREADY_EXISTS',
      message: 'Friendship already exists',
    },
  ],
  [
    FriendshipRequestAlreadyExists,
    {
      status: 409,
      error: 'FRIENDSHIP_REQUEST_ALREADY_EXISTS',
      message: 'Friendship request already exists',
    },
  ],
  [
    FriendshipRequestNotFound,
    {
      status: 404,
      error: 'FRIENDSHIP_REQUEST_NOT_FOUND',
      message: 'Friendship request not found',
    },
  ],
  [
    UnknownFriendshipRequest,
    {
      status: 404,
      error: 'FRIENDSHIP_REQUEST_NOT_FOUND',
      message: 'Friendship request not found',
    },
  ],
  [
    SelfFriendshipRequestError,
    {
      status: 400,
      error: 'SELF_FRIENDSHIP',
      message: 'Cannot befriend yourself',
    },
  ],
  [
    SelfFriendshipError,
    {
      status: 400,
      error: 'SELF_FRIENDSHIP',
      message: 'Cannot befriend yourself',
    },
  ],
  // playlist
  [
    PlaylistAlreadyExists,
    {
      status: 409,
      error: 'PLAYLIST_ALREADY_EXISTS',
      message: 'You already own a playlist with this name',
    },
  ],
  [
    InvalidPlaylistPeriod,
    {
      status: 400,
      error: 'INVALID_PLAYLIST_PERIOD',
      message: 'Playlist end must be after its beginning',
    },
  ],
  [
    PlaylistEndInPast,
    {
      status: 400,
      error: 'PLAYLIST_END_IN_PAST',
      message: 'Playlist end must be in the future',
    },
  ],
  [
    PlaylistNotFound,
    { status: 404, error: 'PLAYLIST_NOT_FOUND', message: 'Playlist not found' },
  ],
  [
    PrivatePlaylist,
    {
      status: 403,
      error: 'PRIVATE_PLAYLIST',
      message: 'This playlist is private, an invitation is required',
    },
  ],
  [
    PlaylistEnded,
    {
      status: 410,
      error: 'PLAYLIST_ENDED',
      message: 'This playlist has ended',
    },
  ],
  [
    PlaylistNotStarted,
    {
      status: 403,
      error: 'PLAYLIST_NOT_STARTED',
      message: 'This playlist has not started yet',
    },
  ],
  [
    AlreadyParticipant,
    {
      status: 409,
      error: 'ALREADY_PARTICIPANT',
      message: 'You are already a member of this playlist',
    },
  ],
  [
    OutsidePlaylistZone,
    {
      status: 403,
      error: 'OUTSIDE_PLAYLIST_ZONE',
      message: `You must be within ${PLAYLIST_ZONE_RADIUS_METERS} m of the playlist`,
    },
  ],
  [
    InvitationForbidden,
    {
      status: 403,
      error: 'INVITATION_FORBIDDEN',
      message: 'Only the owner and privileged participants can invite',
    },
  ],
  [
    NotPlaylistOwner,
    {
      status: 403,
      error: 'NOT_PLAYLIST_OWNER',
      message: 'Only the owner of the playlist can do this',
    },
  ],
  [
    NotPlaylistMember,
    {
      status: 403,
      error: 'NOT_PLAYLIST_MEMBER',
      message: 'You are not a member of this playlist',
    },
  ],
  [
    InviteeNotFound,
    { status: 404, error: 'ACCOUNT_NOT_FOUND', message: 'Account not found' },
  ],
  [
    InvitationNotFound,
    {
      status: 404,
      error: 'INVITATION_NOT_FOUND',
      message: 'Invitation not found',
    },
  ],
  [
    ParticipantNotFound,
    {
      status: 404,
      error: 'PARTICIPANT_NOT_FOUND',
      message: 'Participant not found',
    },
  ],
  [
    InvitationAlreadyExists,
    {
      status: 409,
      error: 'INVITATION_ALREADY_EXISTS',
      message: 'This account already has a pending invitation',
    },
  ],
  // tracks
  [
    NotAVotePlaylist,
    {
      status: 400,
      error: 'NOT_A_VOTE_PLAYLIST',
      message: 'This action is only available on vote playlists',
    },
  ],
  [
    TrackActionForbidden,
    {
      status: 403,
      error: 'TRACK_ACTION_FORBIDDEN',
      message: 'Only invited participants can do this on this playlist',
    },
  ],
  [
    TrackDeleteForbidden,
    {
      status: 403,
      error: 'TRACK_DELETE_FORBIDDEN',
      message: 'Only the owner and privileged participants can delete tracks',
    },
  ],
  [
    CannotVoteOwnTrack,
    {
      status: 403,
      error: 'CANNOT_VOTE_OWN_TRACK',
      message: 'You cannot vote for a track you added',
    },
  ],
  [
    MusicNotFound,
    { status: 404, error: 'MUSIC_NOT_FOUND', message: 'Unknown YouTube video' },
  ],
  [
    TrackNotFound,
    { status: 404, error: 'TRACK_NOT_FOUND', message: 'Track not found' },
  ],
  [
    VoteNotFound,
    {
      status: 404,
      error: 'VOTE_NOT_FOUND',
      message: 'You did not vote for this track',
    },
  ],
  [
    TrackAlreadyInPlaylist,
    {
      status: 409,
      error: 'TRACK_ALREADY_IN_PLAYLIST',
      message: 'This music is already waiting in the playlist',
    },
  ],
  [
    AlreadyVoted,
    {
      status: 409,
      error: 'ALREADY_VOTED',
      message: 'You already voted for this track',
    },
  ],
  [
    TrackAlreadyPlayed,
    {
      status: 409,
      error: 'TRACK_ALREADY_PLAYED',
      message: 'This track has already been played',
    },
  ],
]);

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  logger: Logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res: Response = ctx.getResponse();

    const domainError = DOMAIN_ERRORS.get(
      exception instanceof Error ? exception.constructor : undefined,
    );
    if (domainError) {
      return res
        .status(domainError.status)
        .json({ error: domainError.error, message: domainError.message });
    }

    // Nest exceptions (guards, ValidationPipe...) already carry their status
    if (exception instanceof HttpException) {
      return res.status(exception.getStatus()).json(exception.getResponse());
    }

    this.logger.error(exception);

    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
    });
  }
}
