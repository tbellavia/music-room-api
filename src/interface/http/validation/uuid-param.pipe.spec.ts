import { ArgumentMetadata } from '@nestjs/common';
import { RequestValidationFailed } from './request-validation-failed.error';
import { uuidParam } from './uuid-param.pipe';

const PARAM_METADATA: ArgumentMetadata = { type: 'param', data: 'playlistId' };
const RANDOM_UUID = '3f2b8c1e-9d4a-4e7b-8a6f-1c2d3e4f5a6b';
// The fixed ids of the dev and demo accounts are UUIDs too
const DEV_ACCOUNT_ID = '00000000-0000-4000-8000-000000000001';

describe('uuidParam', () => {
  const pipe = uuidParam('PLAYLIST_ID_INVALID');

  it.each([RANDOM_UUID, DEV_ACCOUNT_ID])('accepts the UUID %s', async (id) => {
    await expect(pipe.transform(id, PARAM_METADATA)).resolves.toBe(id);
  });

  it.each(['abc', '42', `${RANDOM_UUID}x`, ''])(
    'rejects "%s" with the given code',
    async (id) => {
      const result = pipe.transform(id, PARAM_METADATA);

      await expect(result).rejects.toThrow(RequestValidationFailed);
      await expect(result).rejects.toMatchObject({
        code: 'PLAYLIST_ID_INVALID',
      });
    },
  );
});
