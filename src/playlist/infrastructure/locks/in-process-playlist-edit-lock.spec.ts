import { InProcessPlaylistEditLock } from './in-process-playlist-edit-lock';

// Lets the test decide when a piece of work finishes
function createGate() {
  let open: () => void = () => undefined;
  const opened = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { opened, open };
}

describe('InProcessPlaylistEditLock', () => {
  let lock: InProcessPlaylistEditLock;

  beforeEach(() => {
    lock = new InProcessPlaylistEditLock();
  });

  it('returns the result of the work', async () => {
    const result = await lock.runExclusively('playlist-id', () =>
      Promise.resolve(42),
    );

    expect(result).toBe(42);
  });

  it('runs the edits of the same playlist one after the other', async () => {
    const steps: string[] = [];
    const firstGate = createGate();

    const firstEdit = lock.runExclusively('playlist-id', async () => {
      steps.push('first starts');
      await firstGate.opened;
      steps.push('first ends');
    });
    const secondEdit = lock.runExclusively('playlist-id', () => {
      steps.push('second starts');
      return Promise.resolve();
    });

    // Let the event loop run: the second edit must still be waiting
    await Promise.resolve();
    await Promise.resolve();
    expect(steps).toEqual(['first starts']);

    firstGate.open();
    await Promise.all([firstEdit, secondEdit]);

    expect(steps).toEqual(['first starts', 'first ends', 'second starts']);
  });

  it('runs the edits of different playlists in parallel', async () => {
    const steps: string[] = [];
    const firstGate = createGate();

    const firstEdit = lock.runExclusively('first-playlist-id', async () => {
      steps.push('first starts');
      await firstGate.opened;
    });
    await lock.runExclusively('second-playlist-id', () => {
      steps.push('second runs');
      return Promise.resolve();
    });

    expect(steps).toEqual(['first starts', 'second runs']);
    firstGate.open();
    await firstEdit;
  });

  it('keeps going after a failed edit', async () => {
    const failingEdit = lock.runExclusively('playlist-id', () =>
      Promise.reject(new Error('edit failed')),
    );
    const nextEdit = lock.runExclusively('playlist-id', () =>
      Promise.resolve('done'),
    );

    await expect(failingEdit).rejects.toThrow('edit failed');
    await expect(nextEdit).resolves.toBe('done');
  });
});
