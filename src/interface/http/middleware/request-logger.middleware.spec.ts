import { EventEmitter } from 'events';
import { Request, Response } from 'express';
import {
  createRequestLogger,
  ERROR_CODE_LOCAL,
  RequestLogWriter,
} from './request-logger.middleware';

type FakeWriter = {
  log: jest.Mock<void, [string]>;
  warn: jest.Mock<void, [string]>;
  error: jest.Mock<void, [string]>;
};

type FakeRequestInfos = {
  method: string;
  originalUrl: string;
  accountId?: string;
};

type FakeResponseInfos = {
  statusCode: number;
  errorCode?: string;
  isFinished?: boolean;
};

describe('createRequestLogger', () => {
  let writer: FakeWriter;
  let next: jest.Mock<void, []>;

  function fakeRequest(infos: FakeRequestInfos): Request {
    const user =
      infos.accountId === undefined
        ? undefined
        : { sub: infos.accountId, username: 'alice' };
    const request = {
      method: infos.method,
      originalUrl: infos.originalUrl,
      user,
    };
    return request as unknown as Request;
  }

  function fakeResponse(infos: FakeResponseInfos): Response {
    const locals: Record<string, unknown> = {};
    if (infos.errorCode !== undefined) {
      locals[ERROR_CODE_LOCAL] = infos.errorCode;
    }
    const response = Object.assign(new EventEmitter(), {
      statusCode: infos.statusCode,
      locals,
      writableFinished: infos.isFinished ?? true,
    });
    return response as unknown as Response;
  }

  // Runs the middleware, then simulates the end of the response
  function handle(request: Request, response: Response) {
    const writerForMiddleware: RequestLogWriter = writer;
    const middleware = createRequestLogger(writerForMiddleware);
    middleware(request, response, next);
    response.emit('close');
  }

  beforeEach(() => {
    writer = {
      log: jest.fn<void, [string]>(),
      warn: jest.fn<void, [string]>(),
      error: jest.fn<void, [string]>(),
    };
    next = jest.fn<void, []>();
  });

  it('logs a successful request with its account', () => {
    const request = fakeRequest({
      method: 'GET',
      originalUrl: '/api/v1/playlists',
      accountId: 'account-id',
    });

    handle(request, fakeResponse({ statusCode: 200 }));

    expect(next).toHaveBeenCalled();
    expect(writer.log).toHaveBeenCalledWith(
      expect.stringMatching(
        /^GET \/api\/v1\/playlists 200 \d+ms account=account-id$/,
      ),
    );
  });

  it('logs a client error as a warning, with its error code', () => {
    const request = fakeRequest({
      method: 'POST',
      originalUrl: '/api/v1/identity/verify',
    });
    const response = fakeResponse({
      statusCode: 401,
      errorCode: 'INVALID_OTP',
    });

    handle(request, response);

    expect(writer.log).not.toHaveBeenCalled();
    expect(writer.warn).toHaveBeenCalledWith(
      expect.stringMatching(
        /^POST \/api\/v1\/identity\/verify 401 INVALID_OTP \d+ms account=-$/,
      ),
    );
  });

  it('logs a server error as an error', () => {
    const request = fakeRequest({
      method: 'GET',
      originalUrl: '/api/v1/music',
    });
    const response = fakeResponse({
      statusCode: 500,
      errorCode: 'INTERNAL_SERVER_ERROR',
    });

    handle(request, response);

    expect(writer.error).toHaveBeenCalledTimes(1);
  });

  it('never logs the query string', () => {
    const request = fakeRequest({
      method: 'GET',
      originalUrl: '/api/v1/music/search?q=private-search',
      accountId: 'account-id',
    });

    handle(request, fakeResponse({ statusCode: 200 }));

    const loggedMessage = writer.log.mock.calls[0][0];
    expect(loggedMessage).toContain('/api/v1/music/search');
    expect(loggedMessage).not.toContain('private-search');
  });

  it('marks a response closed by the client before its end', () => {
    const request = fakeRequest({
      method: 'GET',
      originalUrl: '/api/v1/playlists/playlist-id/events',
      accountId: 'account-id',
    });
    const response = fakeResponse({ statusCode: 200, isFinished: false });

    handle(request, response);

    const loggedMessage = writer.log.mock.calls[0][0];
    expect(loggedMessage).toMatch(/\(closed by client\)$/);
  });

  it('does not log the health check', () => {
    const request = fakeRequest({
      method: 'GET',
      originalUrl: '/api/v1/health',
    });

    handle(request, fakeResponse({ statusCode: 200 }));

    expect(next).toHaveBeenCalled();
    expect(writer.log).not.toHaveBeenCalled();
  });
});
