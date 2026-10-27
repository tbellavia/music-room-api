import { Track } from './track.entity';
import { TrackAlreadyPlayed } from './errors/track-already-played.error';
import { TrackVersionConflict } from './errors/track-version-conflict.error';

function buildTrack() {
  return Track.create({
    id: 'track-id',
    playlistId: 'playlist-id',
    music: {
      videoId: 'FGBhQbmPwH8',
      name: 'One More Time',
      artist: 'Daft Punk',
      thumbnail: null,
      duration: 321,
    },
    addedBy: 'author-id',
    addedAt: new Date('2026-06-15T20:00:00Z'),
    position: 1024,
  });
}

describe('Track', () => {
  it('is created unplayed with the music informations', () => {
    const track = buildTrack();

    expect(track.isPlayed()).toBe(false);
    expect(track.videoId).toBe('FGBhQbmPwH8');
    expect(track.name).toBe('One More Time');
    expect(track.artist).toBe('Daft Punk');
  });

  it('knows who added it', () => {
    const track = buildTrack();

    expect(track.isAddedBy('author-id')).toBe(true);
    expect(track.isAddedBy('someone-else-id')).toBe(false);
  });

  it('can be marked as played', () => {
    const track = buildTrack();
    const playedAt = new Date('2026-06-15T21:00:00Z');

    track.markAsPlayed(playedAt);

    expect(track.isPlayed()).toBe(true);
    expect(track.playedAt).toEqual(playedAt);
  });

  it('cannot be marked as played twice', () => {
    const track = buildTrack();
    track.markAsPlayed();

    const markAgain = () => track.markAsPlayed();

    expect(markAgain).toThrow(TrackAlreadyPlayed);
  });

  describe('moveTo', () => {
    it('starts at the first version', () => {
      const track = buildTrack();

      expect(track.version).toBe(1);
    });

    it('moves the track and increments its version', () => {
      const track = buildTrack();

      track.moveTo(2048, 1);

      expect(track.position).toBe(2048);
      expect(track.version).toBe(2);
    });

    it('refuses a move based on an outdated version', () => {
      const track = buildTrack();
      track.moveTo(2048, 1);

      const outdatedMove = () => track.moveTo(512, 1);

      expect(outdatedMove).toThrow(TrackVersionConflict);
      expect(track.position).toBe(2048);
      expect(track.version).toBe(2);
    });
  });

  describe('renumberTo', () => {
    it('changes the position without changing the version', () => {
      const track = buildTrack();

      track.renumberTo(3072);

      expect(track.position).toBe(3072);
      expect(track.version).toBe(1);
    });
  });
});
