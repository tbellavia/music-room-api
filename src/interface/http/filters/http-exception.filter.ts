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
import { InvalidPlaylistPeriod } from 'src/playlist/domain/errors/invalid-playlist-period.error';
import { PlaylistAlreadyExists } from 'src/playlist/domain/errors/playlist-already-exists.error';
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
