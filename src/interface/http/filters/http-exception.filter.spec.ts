import {
  ArgumentsHost,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PlaylistNotFound } from 'src/playlist/domain/errors/playlist-not-found.error';
import { RequestValidationFailed } from 'src/interface/http/validation/request-validation-failed.error';
import { InvalidJsonBody } from 'src/interface/http/errors/invalid-json-body.error';
import { RequestBodyTooLarge } from 'src/interface/http/errors/request-body-too-large.error';
import { HttpExceptionFilter } from './http-exception.filter';
import { ERROR_CODE_LOCAL } from 'src/interface/http/middleware/request-logger.middleware';

type FakeResponse = {
  status: jest.Mock<FakeResponse, [number]>;
  json: jest.Mock<void, [unknown]>;
  locals: Record<string, unknown>;
};

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let response: FakeResponse;
  let host: ArgumentsHost;
  let loggedErrors: jest.SpyInstance;

  // Returns the status and the body sent for the given exception
  function send(exception: unknown) {
    filter.catch(exception, host);
    const sentStatus = response.status.mock.calls[0][0];
    const sentBody = response.json.mock.calls[0][0];
    return { sentStatus, sentBody };
  }

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    loggedErrors = jest
      .spyOn(filter.logger, 'error')
      .mockImplementation(() => undefined);
    response = {
      status: jest.fn<FakeResponse, [number]>(),
      json: jest.fn<void, [unknown]>(),
      locals: {},
    };
    response.status.mockReturnValue(response);
    const httpContext = { getResponse: () => response };
    host = { switchToHttp: () => httpContext } as unknown as ArgumentsHost;
  });

  it('leaves the error code to the request logger', () => {
    send(new PlaylistNotFound());

    expect(response.locals[ERROR_CODE_LOCAL]).toBe('PLAYLIST_NOT_FOUND');
  });

  it('sends a domain error with its status and code', () => {
    const { sentStatus, sentBody } = send(new PlaylistNotFound());

    expect(sentStatus).toBe(404);
    expect(sentBody).toEqual({
      status: 404,
      error: 'PLAYLIST_NOT_FOUND',
      message: 'Playlist not found',
    });
  });

  it('sends a validation error with its code and a single message', () => {
    const validationError = new RequestValidationFailed(
      'EMAIL_INVALID',
      'email must be an email',
    );

    const { sentStatus, sentBody } = send(validationError);

    expect(sentStatus).toBe(400);
    expect(sentBody).toEqual({
      status: 400,
      error: 'EMAIL_INVALID',
      message: 'email must be an email',
    });
  });

  it('sends an invalid JSON body in the same format', () => {
    const { sentStatus, sentBody } = send(new InvalidJsonBody());

    expect(sentStatus).toBe(400);
    expect(sentBody).toEqual({
      status: 400,
      error: 'INVALID_JSON',
      message: 'The request body is not valid JSON',
    });
  });

  it('sends a too large body as a 413', () => {
    const { sentStatus, sentBody } = send(new RequestBodyTooLarge());

    expect(sentStatus).toBe(413);
    expect(sentBody).toEqual({
      status: 413,
      error: 'PAYLOAD_TOO_LARGE',
      message: 'The request body is too large',
    });
  });

  it('sends a missing token in the same format', () => {
    const { sentStatus, sentBody } = send(new UnauthorizedException());

    expect(sentStatus).toBe(401);
    expect(sentBody).toEqual({
      status: 401,
      error: 'UNAUTHORIZED',
      message: 'Unauthorized',
    });
  });

  it('sends an unknown route in the same format', () => {
    const unknownRoute = new NotFoundException('Cannot GET /api/v1/unknown');

    const { sentBody } = send(unknownRoute);

    expect(sentBody).toEqual({
      status: 404,
      error: 'NOT_FOUND',
      message: 'Cannot GET /api/v1/unknown',
    });
  });

  it('hides an unexpected error behind a 500 and logs it', () => {
    const { sentStatus, sentBody } = send(new Error('database is down'));

    expect(sentStatus).toBe(500);
    expect(sentBody).toEqual({
      status: 500,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
    });
    expect(loggedErrors).toHaveBeenCalled();
  });
});
