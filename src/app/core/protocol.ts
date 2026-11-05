import type { Action, SharedState } from '../game/model';
import type { Identity } from './identity';

/**
 * The data-channel protocol.
 *
 * Everything is a small JSON envelope. Data channels already give us ordered,
 * reliable, DTLS-encrypted delivery per peer, so the protocol only has to deal
 * with *meaning*: who is allowed to say what, and how peers stay in sync.
 */

export const PROTOCOL_VERSION = 1;
export const MAX_MESSAGE_LENGTH = 256 * 1024;

export type SignalPayload =
  | { k: 'sdp'; type: RTCSdpType; sdp: string }
  | { k: 'ice'; candidate: RTCIceCandidateInit };

export type Wire =
  /** Identity + protocol check, sent the moment a link opens. */
  | { t: 'hello'; v: number; room: string; identity: Identity }
  /** Joiner → host: "put me on the roster". */
  | { t: 'join'; identity: Identity }
  /** Opaque SDP/ICE relayed between two peers that are not connected yet. */
  | { t: 'signal'; id: string; from: string; to: string; payload: SignalPayload }
  /** Host → everyone: an authoritative, sequenced state transition. */
  | { t: 'event'; epoch: string; seq: number; actor: string; action: Action }
  /** Guest → host: a request the host may accept or reject. */
  | { t: 'intent'; action: Action }
  /** Host → one peer (or a new epoch): the full authoritative state. */
  | { t: 'snapshot'; epoch: string; seq: number; state: SharedState; why?: string }
  /** "I missed something, send me a snapshot." */
  | { t: 'resync' }
  /** Host → guest: why an intent was rejected. */
  | { t: 'error'; message: string };

export function serialize(message: Wire): string {
  return JSON.stringify(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function isSignalPayload(value: unknown): value is SignalPayload {
  if (!isRecord(value)) return false;
  if (value['k'] === 'sdp') {
    const type = value['type'];
    return (
      (type === 'offer' || type === 'answer' || type === 'pranswer') &&
      typeof value['sdp'] === 'string' &&
      value['sdp'].length > 0 &&
      value['sdp'].length <= 65536
    );
  }
  if (value['k'] === 'ice') {
    const candidate = value['candidate'];
    return isRecord(candidate) && typeof candidate['candidate'] === 'string';
  }
  return false;
}

/**
 * Parse untrusted channel data into a known envelope, or reject it.
 * We validate shape only; `reduce()` is the authority on whether an action is
 * legal for the sender.
 */
export function parseWire(raw: string): Wire | null {
  if (raw.length === 0 || raw.length > MAX_MESSAGE_LENGTH) return null;

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(value)) return null;

  switch (value['t']) {
    case 'hello':
      return typeof value['v'] === 'number' &&
        typeof value['room'] === 'string'
        ? (value as Wire)
        : null;
    case 'join':
      return isRecord(value['identity']) ? (value as Wire) : null;
    case 'signal':
      return typeof value['id'] === 'string' &&
        typeof value['from'] === 'string' &&
        typeof value['to'] === 'string' &&
        isSignalPayload(value['payload'])
        ? (value as Wire)
        : null;
    case 'event':
      return typeof value['epoch'] === 'string' &&
        typeof value['seq'] === 'number' &&
        typeof value['actor'] === 'string' &&
        isRecord(value['action'])
        ? (value as Wire)
        : null;
    case 'intent':
      return isRecord(value['action']) ? (value as Wire) : null;
    case 'snapshot':
      return typeof value['epoch'] === 'string' &&
        typeof value['seq'] === 'number' &&
        isRecord(value['state'])
        ? (value as Wire)
        : null;
    case 'resync':
      return { t: 'resync' };
    case 'error':
      return typeof value['message'] === 'string'
        ? { t: 'error', message: value['message'] }
        : null;
    default:
      return null;
  }
}
