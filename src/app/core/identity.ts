/**
 * Identity is deliberately tiny: an opaque id and a display name.
 *
 * Avatars are *derived* from the id, never transmitted. That keeps invite
 * blobs small (a data-URI image would dominate them) and means every peer
 * renders the same face for the same person without trusting the wire.
 */

export interface Identity {
  id: string;
  name: string;
}

const STORAGE_KEY = 'lets-play:identity';
const NAME_MAX = 24;

const ADJECTIVES = [
  'amber',
  'brisk',
  'clever',
  'cosmic',
  'dapper',
  'eager',
  'fuzzy',
  'gentle',
  'jolly',
  'lucky',
  'mellow',
  'nimble',
  'plucky',
  'quiet',
  'rapid',
  'sunny',
  'tidy',
  'vivid',
  'witty',
  'zesty',
];

const NOUNS = [
  'otter',
  'badger',
  'comet',
  'dragon',
  'ember',
  'falcon',
  'gecko',
  'heron',
  'ibis',
  'jackal',
  'koala',
  'lemur',
  'marmot',
  'newt',
  'ocelot',
  'panda',
  'quokka',
  'raven',
  'sloth',
  'tiger',
];

export function newId(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (cryptoApi?.getRandomValues) {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function randomName(): string {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${a} ${n}`;
}

export function sanitizeName(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
}

export function isIdentity(value: unknown): value is Identity {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate['id'] === 'string' &&
    candidate['id'].length > 0 &&
    candidate['id'].length <= 128 &&
    typeof candidate['name'] === 'string' &&
    candidate['name'].length > 0 &&
    candidate['name'].length <= 64
  );
}

export function loadIdentity(): Identity | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isIdentity(parsed)) return null;
    return { id: parsed.id, name: sanitizeName(parsed.name) || randomName() };
  } catch {
    return null;
  }
}

export function saveIdentity(identity: Identity): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ id: identity.id, name: sanitizeName(identity.name) }),
    );
  } catch {
    // Storage can be unavailable (private mode, quota). Identity still works
    // for the current tab.
  }
}

/** FNV-1a, used to seed the avatar grid deterministically from the id. */
function hash32(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function xorshift(seed: number): () => number {
  let state = seed || 0x9e3779b9;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return state >>> 0;
  };
}

/**
 * A 5x5 mirror-symmetric identicon as an inline SVG data URI. Cheap, stable,
 * and it renders identically on every peer.
 */
export function avatarFor(seed: string): string {
  const hash = hash32(seed);
  const rand = xorshift(hash);
  const hue = hash % 360;
  const fg = `hsl(${hue} 72% 62%)`;
  const bg = `hsl(${hue} 32% 16%)`;

  const rects: string[] = [];
  let filled = 0;
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 3; col++) {
      const on = (rand() & 7) > 2;
      if (!on) continue;
      filled++;
      rects.push(`<rect x="${col}" y="${row}" width="1" height="1"/>`);
      const mirror = 4 - col;
      if (mirror !== col) {
        rects.push(`<rect x="${mirror}" y="${row}" width="1" height="1"/>`);
      }
    }
  }
  // Never emit a blank avatar.
  if (filled === 0) {
    rects.push('<rect x="2" y="2" width="1" height="1"/>');
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 5 5" ` +
    `shape-rendering="crispEdges">` +
    `<rect width="5" height="5" fill="${bg}"/>` +
    `<g fill="${fg}">${rects.join('')}</g>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
