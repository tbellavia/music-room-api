import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { JwtService } from '@nestjs/jwt';
import { JwtUser } from 'src/identity/types/jwt-user';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

const JWT_SECRET = 'test-secret';
const OTHER_SECRET = 'other-secret';

const alice: JwtUser = { sub: 'alice-id', username: 'alice' };
const dev1DevPayload: JwtUser = {
  sub: 'dev1-id',
  username: 'dev1',
  dev: true,
};

type FakeRequest = {
  headers: { authorization?: string };
  user?: JwtUser;
};

// Route handlers seen by the guard: only their metadata matters
class FakeController {}
function protectedRoute() {}
function publicRoute() {}
Reflect.defineMetadata(IS_PUBLIC_KEY, true, publicRoute);

function contextFor(request: FakeRequest, handler: () => void) {
  return new ExecutionContextHost([request], FakeController, handler);
}

function protectedContextFor(request: FakeRequest) {
  return contextFor(request, protectedRoute);
}

function withBearer(token: string): FakeRequest {
  return { headers: { authorization: `Bearer ${token}` } };
}

describe('JwtAuthGuard', () => {
  const jwtService = new JwtService({ secret: JWT_SECRET });

  function guardIn(environment: string | undefined): JwtAuthGuard {
    const config = new ConfigService({
      JWT_SECRET,
      ENVIRONMENT: environment,
    });
    return new JwtAuthGuard(jwtService, new Reflector(), config);
  }

  describe('in prod', () => {
    const guard = guardIn('prod');

    it('lets a valid token through and exposes its account', async () => {
      const token = await jwtService.signAsync(alice);
      const request = withBearer(token);

      const canActivate = await guard.canActivate(protectedContextFor(request));

      expect(canActivate).toBe(true);
      expect(request.user?.sub).toBe('alice-id');
      expect(request.user?.username).toBe('alice');
    });

    it('lets a public route through without token', async () => {
      const request: FakeRequest = { headers: {} };
      const context = contextFor(request, publicRoute);

      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('rejects a request without token', async () => {
      const request: FakeRequest = { headers: {} };

      await expect(
        guard.canActivate(protectedContextFor(request)),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects another authorization scheme', async () => {
      const token = await jwtService.signAsync(alice);
      const request = { headers: { authorization: `Basic ${token}` } };

      await expect(
        guard.canActivate(protectedContextFor(request)),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a malformed token', async () => {
      const request = withBearer('not-a-jwt');

      await expect(
        guard.canActivate(protectedContextFor(request)),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a token signed with another secret', async () => {
      const forgedToken = await jwtService.signAsync(alice, {
        secret: OTHER_SECRET,
      });
      const request = withBearer(forgedToken);

      await expect(
        guard.canActivate(protectedContextFor(request)),
      ).rejects.toThrow(UnauthorizedException);
      expect(request.user).toBeUndefined();
    });

    it('rejects an expired token', async () => {
      const expiredToken = await jwtService.signAsync(alice, {
        expiresIn: -1,
      });
      const request = withBearer(expiredToken);

      await expect(
        guard.canActivate(protectedContextFor(request)),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('in dev', () => {
    const guard = guardIn('dev');

    it('rejects a request without token, like in prod', async () => {
      const request: FakeRequest = { headers: {} };

      await expect(
        guard.canActivate(protectedContextFor(request)),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an invalid token', async () => {
      const request = withBearer('not-a-jwt');

      await expect(
        guard.canActivate(protectedContextFor(request)),
      ).rejects.toThrow(UnauthorizedException);
      expect(request.user).toBeUndefined();
    });

    it('lets a dev token through and exposes its account', async () => {
      const token = await jwtService.signAsync(dev1DevPayload);
      const request = withBearer(token);

      await guard.canActivate(protectedContextFor(request));

      expect(request.user?.username).toBe('dev1');
    });
  });

  // A dev token is signed with the same secret: it must not open the API
  // outside dev mode
  describe('dev token outside dev mode', () => {
    it.each(['prod', 'test', undefined])(
      'is rejected with ENVIRONMENT=%s',
      async (environment) => {
        const guard = guardIn(environment);
        const token = await jwtService.signAsync(dev1DevPayload);
        const request = withBearer(token);

        await expect(
          guard.canActivate(protectedContextFor(request)),
        ).rejects.toThrow(UnauthorizedException);
        expect(request.user).toBeUndefined();
      },
    );
  });

  describe('in test', () => {
    it('rejects a request without token', async () => {
      const guard = guardIn('test');
      const request: FakeRequest = { headers: {} };

      await expect(
        guard.canActivate(protectedContextFor(request)),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('without environment', () => {
    it('rejects a request without token', async () => {
      const guard = guardIn(undefined);
      const request: FakeRequest = { headers: {} };

      await expect(
        guard.canActivate(protectedContextFor(request)),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
