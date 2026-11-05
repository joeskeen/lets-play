import {
  decodeInvite,
  encodeInvite,
  extractInviteCode,
  INVITE_VERSION,
  inviteUrl,
  isInvite,
  readInviteCode,
} from './invite';
import type { Invite } from './invite';

const sample: Invite = {
  v: INVITE_VERSION,
  k: 'invite',
  room: 'room-1',
  from: { id: 'host-id', name: 'Ada' },
  sdp: 'v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n',
  at: 1_700_000_000_000,
};

describe('invite', () => {
  it('round-trips an invite', async () => {
    const code = await encodeInvite(sample);
    await expect(decodeInvite(code)).resolves.toEqual(sample);
  });

  it('rejects arbitrary text', async () => {
    await expect(decodeInvite('definitely-not-an-invite')).rejects.toThrow();
  });

  it('validates the SDP marker', () => {
    expect(isInvite({ ...sample, sdp: 'hello' })).toBe(false);
    expect(isInvite({ ...sample, room: '' })).toBe(false);
    expect(isInvite({ ...sample, from: { id: '', name: 'x' } })).toBe(false);
  });

  it('builds and reads invite urls', () => {
    const url = inviteUrl('abc123', 'https://example.test/play');
    expect(url).toBe('https://example.test/play#i=abc123');
    expect(readInviteCode('#i=abc123')).toBe('abc123');
    expect(readInviteCode('')).toBeNull();
  });

  it('extracts codes from pasted links and fragments', () => {
    expect(extractInviteCode('https://example.test/play#i=xyz&other=1')).toBe(
      'xyz',
    );
    expect(extractInviteCode('#i=xyz')).toBe('xyz');
    expect(extractInviteCode('i=xyz')).toBe('xyz');
    expect(extractInviteCode('  xyz  ')).toBe('xyz');
  });
});
