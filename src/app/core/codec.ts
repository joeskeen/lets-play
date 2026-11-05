/**
 * Wire codec for invite blobs.
 *
 * Format: [1 byte flag][payload], base64url-encoded.
 *   0 = raw UTF-8 JSON
 *   1 = JSON compressed with deflate-raw
 *
 * Compression is only used when it actually shrinks the payload. Everything
 * is Unicode-safe (TextEncoder, not btoa on the JSON) so names with emoji or
 * accents survive — the 2020 version threw on any code point above U+00FF.
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const FLAG_RAW = 0;
const FLAG_DEFLATE = 1;

const MAX_BYTES = 512 * 1024;

function hasCompression(): boolean {
  return (
    typeof CompressionStream !== 'undefined' &&
    typeof DecompressionStream !== 'undefined'
  );
}

async function transform(
  bytes: Uint8Array,
  stream: CompressionStream | DecompressionStream,
): Promise<Uint8Array> {
  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });

  // TypeScript 6 models the DOM's CompressionStream as
  // `ReadableWritablePair<Uint8Array<ArrayBuffer>, Uint8Array<ArrayBufferLike>>`,
  // which is narrower than what `pipeThrough` infers here. The runtime shapes
  // match; only the generic buffer type differs.
  const pair = stream as unknown as ReadableWritablePair<
    Uint8Array,
    Uint8Array
  >;
  return collect(source.pipeThrough(pair));
}

async function collect(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      length += value.byteLength;
    }
  }

  const out = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

export function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (normalized.length % 4)) % 4;
  const binary = atob(normalized + '='.repeat(padding));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function pack(value: unknown): Promise<string> {
  let json: string | undefined;
  try {
    json = JSON.stringify(value);
  } catch {
    throw new Error('That value cannot be encoded.');
  }
  if (json === undefined) throw new Error('That value cannot be encoded.');

  const raw = encoder.encode(json);
  if (raw.byteLength > MAX_BYTES) throw new Error('Payload is too large.');

  let body: Uint8Array = raw;
  let flag = FLAG_RAW;

  if (hasCompression()) {
    const deflated = await transform(raw, new CompressionStream('deflate-raw'));
    if (deflated.byteLength < raw.byteLength) {
      body = deflated;
      flag = FLAG_DEFLATE;
    }
  }

  const framed = new Uint8Array(body.byteLength + 1);
  framed[0] = flag;
  framed.set(body, 1);
  return toBase64Url(framed);
}

export async function unpack<T = unknown>(text: string): Promise<T> {
  const value = text.trim();
  if (!value) throw new Error('That code is empty.');

  let framed: Uint8Array;
  try {
    framed = fromBase64Url(value);
  } catch {
    throw new Error('That code is not valid base64url.');
  }
  if (framed.byteLength < 2) throw new Error('That code is incomplete.');

  const flag = framed[0];
  const body = framed.subarray(1);

  let bytes: Uint8Array;
  if (flag === FLAG_RAW) {
    bytes = body;
  } else if (flag === FLAG_DEFLATE) {
    if (!hasCompression()) {
      throw new Error('This browser cannot read compressed invites.');
    }
    bytes = await transform(body, new DecompressionStream('deflate-raw'));
  } else {
    throw new Error('That code was made by a newer version of Let’s Play.');
  }

  if (bytes.byteLength > MAX_BYTES) throw new Error('Payload is too large.');

  try {
    return JSON.parse(decoder.decode(bytes)) as T;
  } catch {
    throw new Error('That code contains malformed data.');
  }
}
