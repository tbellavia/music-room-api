import { NextFunction, Request, Response } from 'express';
import { API_PREFIX } from 'src/shared/constants';

// Set by the exception filter: the middleware does not see the exception,
// only the response, so the business error code travels through res.locals
export const ERROR_CODE_LOCAL = 'errorCode';

// The methods of the Nest Logger used here: a fake can replace it in tests
export type RequestLogWriter = {
  log(message: string): void;
  warn(message: string): void;
  error(message: string): void;
};

export type RequestLoggerMiddleware = (
  request: Request,
  response: Response,
  next: NextFunction,
) => void;

const HEALTH_CHECK_PATH = `/${API_PREFIX}/health`;
const NO_ACCOUNT = '-';

// One line per request: method, path, status, error code, duration, account.
// Never the body nor the query string (searches, personal data).
export function createRequestLogger(
  writer: RequestLogWriter,
): RequestLoggerMiddleware {
  return (request: Request, response: Response, next: NextFunction) => {
    const path = request.originalUrl.split('?')[0];

    // Called every few seconds by the infrastructure: it would drown the logs
    if (path === HEALTH_CHECK_PATH) {
      next();
      return;
    }

    const startedAt = Date.now();

    // 'close' rather than 'finish': it is also emitted when the client leaves
    // before the end, which is how a Server-Sent Events stream usually ends
    response.on('close', () => {
      const durationInMilliseconds = Date.now() - startedAt;
      const message = buildMessage(
        request,
        response,
        path,
        durationInMilliseconds,
      );
      writeWithLevel(writer, response.statusCode, message);
    });

    next();
  };
}

function buildMessage(
  request: Request,
  response: Response,
  path: string,
  durationInMilliseconds: number,
): string {
  const parts = [request.method, path, response.statusCode.toString()];

  const errorCode = readErrorCode(response);
  if (errorCode !== null) {
    parts.push(errorCode);
  }

  parts.push(`${durationInMilliseconds}ms`);

  // Set by the JWT guard, which runs after this middleware but before 'close'
  const accountId = request.user?.sub ?? NO_ACCOUNT;
  parts.push(`account=${accountId}`);

  if (!response.writableFinished) {
    parts.push('(closed by client)');
  }

  return parts.join(' ');
}

function readErrorCode(response: Response): string | null {
  const errorCode: unknown = response.locals[ERROR_CODE_LOCAL];

  if (typeof errorCode !== 'string') {
    return null;
  }
  return errorCode;
}

function writeWithLevel(
  writer: RequestLogWriter,
  status: number,
  message: string,
): void {
  if (status >= 500) {
    writer.error(message);
    return;
  }
  if (status >= 400) {
    writer.warn(message);
    return;
  }
  writer.log(message);
}
