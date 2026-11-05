import { pack, unpack } from './codec';
import { Identity, isIdentity } from './identity';

/**
 * The whole out-of-band handshake, in two blobs.
 *
 * An invite is the host's offer. A reply is the joiner's answer. Each is a
 * single RTCPeerConnection's worth of SDP, compressed and base64url-encoded,
 * and is single-use: it contains ephemeral ICE credentials and a DTLS
 * fingerprint. Forwarding it to the wrong person is the only way to leak it,
 * and it is useless after the connection is established.
 */

export const INVITE_VERSION = 1;

export type InviteKind = 'invite' | 'reply';

export interface Invite {
  v: typeof INVITE_VERSION;
  k: InviteKind;
  /** Room id, so a link cannot be replayed into a different game. */
  room: string;
  /** Host identity on an invite; joiner identity on a reply. */
  from: Identity;
  /** Full SDP, ICE candidates included. */
  sdp: string;
  /** Creation time, for the host's own sanity checks. */
  at: number;
}

export async function encodeInvite(invite: Invite): Promise<string> {
  if (!isInvite(invite)) throw new Error('Refusing to encode a malformed invite.');
  return pack(invite);
}

export async function decodeInvite(code: string): Promise<Invite> {
  const raw = await unpack<unknown>(code);
  if (!isInvite(raw)) throw new Error('That code is not a valid invite or reply.');
  return raw;
}

export function isInvite(value: unknown): value is Invite {
  if (!value || typeof value !== 'object') return false;
  const invite = value as Record<string, unknown>;
  return (
    invite['v'] === INVITE_VERSION &&
    (invite['k'] === 'invite' || invite['k'] === 'reply') &&
    typeof invite['room'] === 'string' &&
    invite['room'].length > 0 &&
    invite['room'].length <= 128 &&
    isIdentity(invite['from']) &&
    typeof invite['sdp'] === 'string' &&
    invite['sdp'].length > 16 &&
    invite['sdp'].length <= 65536 &&
    invite['sdp'].includes('v=0') &&
    typeof invite['at'] === 'number'
  );
}

/** Build the shareable URL for a code, defaulting to the current page. */
export function inviteUrl(code: string, base?: string): string {
  const url = new URL(base ?? location.href);
  url.hash = `i=${code}`;
  return url.toString();
}

/**
 * Accept anything a person might paste: a full invite link, a `#i=...`
 * fragment, or a bare code.
 */
export function extractInviteCode(input: string): string {
  const text = input.trim();
  if (!text) return '';

  const marked = text.indexOf('#i=');
  if (marked >= 0) return text.slice(marked + 3).split('&')[0] ?? '';

  if (text.startsWith('i=')) return text.slice(2).split('&')[0] ?? '';

  return text;
}

/** Read the invite code out of a `location.hash`, if there is one. */
export function readInviteCode(hash: string): string | null {
  const code = extractInviteCode(hash);
  return code || null;
}

/** Remove the invite from the address bar without adding a history entry. */
export function clearInviteFromUrl(): void {
  if (!location.hash) return;
  history.replaceState(null, '', location.pathname + location.search);
}
