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
import { DEMO_ACCOUNTS, LEA } from 'src/demo/domain/demo-accounts';
import { RemoveDemoUseCase } from '../remove-demo/remove-demo.usecase';
import { SeedDemoUseCase } from './seed-demo.usecase';
import { SeedDemoInput } from './seed-demo.contracts';

const CAMPUS_42: Coordinates = { latitude: 48.8966, longitude: 2.3184 };
const DEMO_PASSWORD = 'DemoPassword1!';

const input: SeedDemoInput = {
  password: DEMO_PASSWORD,
  origin: CAMPUS_42,
  onlyIfMissing: false,
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

  async function givenDevAccounts() {
    for (const devAccount of [DEV1_ACCOUNT, DEV2_ACCOUNT]) {
      await accountRepository.save(
        Account.preVerified({ ...devAccount, password: 'hash' }),
      );
    }
  }

  beforeEach(() => {
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

  it('creates the demo accounts, verified, with the given password', async () => {
    await useCase.execute(input);

    expect(accountRepository.accounts.size).toBe(DEMO_ACCOUNTS.length);
    const lea = await accountRepository.findById(LEA.id);
    expect(lea?.username).toBe('lea.dj');
    expect(lea?.is_active).toBe(true);
    expect(lea?.password).toBe(`hashed:${DEMO_PASSWORD}`);
  });

  it('creates the playlists, their members, tracks and votes', async () => {
    const output = await useCase.execute(input);

    expect(output.seeded).toBe(true);
    expect(playlistRepository.playlists.size).toBe(output.playlists);
    expect(trackRepository.tracks.size).toBe(output.tracks);
    expect(voteRepository.votes).toHaveLength(output.votes);
    expect(participantRepository.participants.size).toBeGreaterThan(0);
    expect(invitationRepository.invitations.size).toBeGreaterThan(0);
    expect(friendshipRepository.friendships.size).toBeGreaterThan(0);
    expect(friendshipRequestRepository.requests.size).toBeGreaterThan(0);
  });

  it('keeps the order of the scenario in an EDITOR playlist', async () => {
    await useCase.execute(input);

    const radio = [...playlistRepository.playlists.values()].find(
      (playlist) => playlist.name === 'Radio du campus',
    );
    const radioTracks = [...trackRepository.tracks.values()].filter(
      (track) => track.playlistId === radio?.id,
    );
    const positions = radioTracks.map((track) => track.position ?? 0);
    const sortedPositions = [...positions].sort((a, b) => a - b);
    expect(radioTracks.length).toBeGreaterThan(0);
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

  it('links dev1 and dev2 when they exist', async () => {
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

    expect(accountRepository.accounts.size).toBe(DEMO_ACCOUNTS.length);
    const lea = await accountRepository.findById(LEA.id);
    expect(lea?.password).toBe('hashed:AnotherPassword1!');
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
    expect(accountRepository.accounts.size).toBe(DEMO_ACCOUNTS.length);
  });

  it('refuses to seed when a real account took a demo username', async () => {
    const realAccount = Account.preVerified({
      id: 'real-account-id',
      username: LEA.username,
      email: 'lea@gmail.com',
      password: 'hash',
    });
    await accountRepository.save(realAccount);

    await expect(useCase.execute(input)).rejects.toThrow(LEA.username);
    expect(accountRepository.accounts.size).toBe(1);
    expect(playlistRepository.playlists.size).toBe(0);
  });
});
