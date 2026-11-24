import { InMemoryAccountRepository } from 'src/identity/infrastructure/persistence/in-memory-account.repository';
import { FakePasswordHasher } from 'src/identity/infrastructure/crypto/fake-password-hasher';
import { InMemoryFriendshipRepository } from 'src/social/infrastructure/persistence/friendship/in-memory-friendship.repository';
import { InMemoryFriendshipRequestRepository } from 'src/social/infrastructure/persistence/friendship-request/in-memory-friendship-request.repository';
import { InMemoryPlaylistRepository } from 'src/playlist/infrastructure/persistence/playlist/in-memory-playlist.repository';
import { InMemoryParticipantRepository } from 'src/playlist/infrastructure/persistence/participant/in-memory-participant.repository';
import { InMemoryInvitationRepository } from 'src/playlist/infrastructure/persistence/invitation/in-memory-invitation.repository';
import { InMemoryTrackRepository } from 'src/playlist/infrastructure/persistence/track/in-memory-track.repository';
import { InMemoryVoteRepository } from 'src/playlist/infrastructure/persistence/vote/in-memory-vote.repository';
import { Account } from 'src/identity/domain/account.entity';
import { DEV1_ACCOUNT, DEV2_ACCOUNT } from 'src/identity/domain/dev-accounts';
import { Coordinates } from 'src/playlist/domain/geo';
import { fakerFR as faker } from '@faker-js/faker';
import {
  DEMO_GUEST,
  DEMO_OWNER,
  FIXED_DEMO_ACCOUNTS,
  demoAccount,
} from 'src/demo/domain/demo-accounts';
import { generateDemo } from 'src/demo/domain/demo-generator';
import { RemoveDemoUseCase } from '../remove-demo/remove-demo.usecase';
import { SeedDemoUseCase } from './seed-demo.usecase';
import { SeedDemoInput } from './seed-demo.contracts';

const CAMPUS_42: Coordinates = { latitude: 48.8966, longitude: 2.3184 };
const DEMO_PASSWORD = 'DemoPassword1!';
const NOW = new Date('2026-11-23T20:00:00Z');
const FIXED_ACCOUNT_COUNT = FIXED_DEMO_ACCOUNTS.length;
const SHOWCASE_PLAYLIST_COUNT = 5;

const input: SeedDemoInput = {
  password: DEMO_PASSWORD,
  origin: CAMPUS_42,
  size: 10,
  onlyIfMissing: false,
  now: NOW,
};

describe('SeedDemoUseCase', () => {
  let accountRepository: InMemoryAccountRepository;
  let friendshipRepository: InMemoryFriendshipRepository;
  let friendshipRequestRepository: InMemoryFriendshipRequestRepository;
  let playlistRepository: InMemoryPlaylistRepository;
  let participantRepository: InMemoryParticipantRepository;
  let invitationRepository: InMemoryInvitationRepository;
  let trackRepository: InMemoryTrackRepository;
  let voteRepository: InMemoryVoteRepository;
  let useCase: SeedDemoUseCase;

  function playlistNamed(name: string) {
    return [...playlistRepository.playlists.values()].find(
      (playlist) => playlist.name === name,
    );
  }

  async function givenDevAccounts() {
    for (const devAccount of [DEV1_ACCOUNT, DEV2_ACCOUNT]) {
      await accountRepository.save(
        Account.preVerified({ ...devAccount, password: 'hash' }),
      );
    }
  }

  beforeEach(() => {
    // Some checks depend on the draw (a played track, a vote…): seeded so that
    // they never fail by chance
    faker.seed(1);
    accountRepository = new InMemoryAccountRepository();
    friendshipRepository = new InMemoryFriendshipRepository();
    friendshipRequestRepository = new InMemoryFriendshipRequestRepository();
    playlistRepository = new InMemoryPlaylistRepository();
    participantRepository = new InMemoryParticipantRepository();
    invitationRepository = new InMemoryInvitationRepository();
    trackRepository = new InMemoryTrackRepository();
    voteRepository = new InMemoryVoteRepository();
    useCase = new SeedDemoUseCase(
      accountRepository,
      new FakePasswordHasher(),
      friendshipRepository,
      friendshipRequestRepository,
      playlistRepository,
      participantRepository,
      invitationRepository,
      trackRepository,
      voteRepository,
      new RemoveDemoUseCase(accountRepository),
    );
  });

  it('creates demo.owner and demo.guest, verified, with the given password', async () => {
    await useCase.execute({ ...input, size: 0 });

    const owner = await accountRepository.findById(DEMO_OWNER.id);
    const guest = await accountRepository.findById(DEMO_GUEST.id);
    expect(accountRepository.accounts.size).toBe(FIXED_ACCOUNT_COUNT);
    expect(owner?.username).toBe('demo.owner');
    expect(owner?.is_active).toBe(true);
    expect(owner?.password).toBe(`hashed:${DEMO_PASSWORD}`);
    expect(guest?.username).toBe('demo.guest');
  });

  it('adds the generated accounts, verified, with the same password', async () => {
    const output = await useCase.execute(input);

    const firstGenerated = demoAccount(FIXED_ACCOUNT_COUNT + 1, '');
    const account = await accountRepository.findById(firstGenerated.id);
    expect(output.accounts).toBe(FIXED_ACCOUNT_COUNT + 10);
    expect(accountRepository.accounts.size).toBe(FIXED_ACCOUNT_COUNT + 10);
    expect(account?.is_active).toBe(true);
    expect(account?.password).toBe(`hashed:${DEMO_PASSWORD}`);
  });

  it('creates the playlists of demo.owner, and one for two generated accounts', async () => {
    const output = await useCase.execute(input);

    expect(output.playlists).toBe(SHOWCASE_PLAYLIST_COUNT + 5);
    expect(playlistNamed('Soirée en cours')?.ownerId).toBe(DEMO_OWNER.id);
    expect(playlistNamed('Projet privé')?.ownerId).toBe(DEMO_OWNER.id);
  });

  it('creates the members, invitations, tracks, votes and social graph', async () => {
    const output = await useCase.execute(input);

    expect(playlistRepository.playlists.size).toBe(output.playlists);
    expect(trackRepository.tracks.size).toBe(output.tracks);
    expect(voteRepository.votes).toHaveLength(output.votes);
    expect(participantRepository.participants.size).toBeGreaterThan(0);
    expect(invitationRepository.invitations.size).toBeGreaterThan(0);
    expect(friendshipRepository.friendships.size).toBeGreaterThan(0);
    expect(friendshipRequestRepository.requests.size).toBeGreaterThan(0);
  });

  it('gives demo.guest a playlist, an invitation and a friendship request', async () => {
    await useCase.execute(input);

    const participations = await participantRepository.findByAccount(
      DEMO_GUEST.id,
    );
    const invitations = [...invitationRepository.invitations.values()].filter(
      (invitation) => invitation.inviteeId === DEMO_GUEST.id,
    );
    const requests = await friendshipRequestRepository.findByReceiverId(
      DEMO_GUEST.id,
    );
    expect(participations.length).toBeGreaterThan(0);
    expect(invitations.length).toBeGreaterThan(0);
    expect(requests.length).toBeGreaterThan(0);
  });

  it('keeps the generated order in an EDITOR playlist', async () => {
    await useCase.execute(input);

    const collaborative = playlistNamed('Playlist collaborative');
    const collaborativeTracks = [...trackRepository.tracks.values()].filter(
      (track) => track.playlistId === collaborative?.id,
    );
    const positions = collaborativeTracks.map((track) => track.position ?? 0);
    const sortedPositions = [...positions].sort((a, b) => a - b);
    expect(collaborativeTracks.length).toBeGreaterThan(0);
    expect(positions).toEqual(sortedPositions);
  });

  it('marks as played the tracks of the history', async () => {
    await useCase.execute(input);

    const playedTracks = [...trackRepository.tracks.values()].filter((track) =>
      track.isPlayed(),
    );
    expect(playedTracks.length).toBeGreaterThan(0);
    for (const track of playedTracks) {
      expect(track.position).toBeNull();
    }
  });

  it('gives dev1 and dev2 the content of demo.guest when they exist', async () => {
    await givenDevAccounts();

    await useCase.execute(input);

    const dev1Participations = await participantRepository.findByAccount(
      DEV1_ACCOUNT.id,
    );
    const dev2Requests = await friendshipRequestRepository.findByReceiverId(
      DEV2_ACCOUNT.id,
    );
    expect(dev1Participations.length).toBeGreaterThan(0);
    expect(dev2Requests.length).toBeGreaterThan(0);
  });

  it('does not refer to dev1 and dev2 when they do not exist', async () => {
    await useCase.execute(input);

    const dev1Participations = await participantRepository.findByAccount(
      DEV1_ACCOUNT.id,
    );
    expect(dev1Participations).toEqual([]);
  });

  it('replaces an existing demo, without duplicating the accounts', async () => {
    await useCase.execute(input);

    await useCase.execute({ ...input, password: 'AnotherPassword1!' });

    const owner = await accountRepository.findById(DEMO_OWNER.id);
    expect(accountRepository.accounts.size).toBe(FIXED_ACCOUNT_COUNT + 10);
    expect(owner?.password).toBe('hashed:AnotherPassword1!');
  });

  it('removes the accounts in excess when SEED_COUNT gets smaller', async () => {
    await useCase.execute({ ...input, size: 20 });

    await useCase.execute({ ...input, size: 5 });

    const lastOfTheLargerDemo = demoAccount(FIXED_ACCOUNT_COUNT + 20, '');
    const removed = await accountRepository.findById(lastOfTheLargerDemo.id);
    expect(accountRepository.accounts.size).toBe(FIXED_ACCOUNT_COUNT + 5);
    expect(removed).toBeNull();
  });

  it('leaves an existing demo untouched with onlyIfMissing', async () => {
    await useCase.execute(input);
    const playlistCount = playlistRepository.playlists.size;

    const output = await useCase.execute({ ...input, onlyIfMissing: true });

    expect(output.seeded).toBe(false);
    expect(playlistRepository.playlists.size).toBe(playlistCount);
  });

  it('seeds with onlyIfMissing when there is no demo', async () => {
    const output = await useCase.execute({ ...input, onlyIfMissing: true });

    expect(output.seeded).toBe(true);
    expect(accountRepository.accounts.size).toBe(FIXED_ACCOUNT_COUNT + 10);
  });

  it('refuses to seed when a real account took demo.owner', async () => {
    const realAccount = Account.preVerified({
      id: 'real-account-id',
      username: DEMO_OWNER.username,
      email: 'owner@gmail.com',
      password: 'hash',
    });
    await accountRepository.save(realAccount);

    await expect(useCase.execute(input)).rejects.toThrow(DEMO_OWNER.username);
    expect(accountRepository.accounts.size).toBe(1);
    expect(playlistRepository.playlists.size).toBe(0);
  });

  it('generates other usernames when a real account took a generated one', async () => {
    const generatorOptions = {
      size: 1,
      now: NOW,
      origin: CAMPUS_42,
      devAccountIds: [],
    };
    faker.seed(42);
    const firstDraw = generateDemo(generatorOptions);
    const takenUsername = firstDraw.accounts[FIXED_ACCOUNT_COUNT].username;
    const realAccount = Account.preVerified({
      id: 'real-account-id',
      username: takenUsername,
      email: 'real@gmail.com',
      password: 'hash',
    });
    await accountRepository.save(realAccount);

    faker.seed(42);
    await useCase.execute({ ...input, size: 1 });

    const generated = await accountRepository.findById(
      demoAccount(FIXED_ACCOUNT_COUNT + 1, '').id,
    );
    expect(generated?.username).not.toBe(takenUsername);
    expect(accountRepository.accounts.has('real-account-id')).toBe(true);
  });
});
