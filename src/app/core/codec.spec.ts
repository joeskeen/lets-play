import { fromBase64Url, pack, toBase64Url, unpack } from './codec';

describe('codec', () => {
  it('round-trips unicode payloads', async () => {
    const value = { name: 'Zoë 🎉', lines: ['naïve', '日本語'] };
    const code = await pack(value);
    await expect(unpack(code)).resolves.toEqual(value);
  });

  it('produces url-safe output', async () => {
    const code = await pack({ text: '?'.repeat(200) });
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('round-trips raw bytes through base64url', () => {
    const bytes = new Uint8Array([0, 1, 2, 127, 128, 250, 255]);
    expect(Array.from(fromBase64Url(toBase64Url(bytes)))).toEqual(
      Array.from(bytes),
    );
  });

  it('rejects empty and malformed codes', async () => {
    await expect(unpack('')).rejects.toThrow();
    await expect(unpack('!!!!')).rejects.toThrow();
  });

  it('rejects unknown framing flags', async () => {
    const framed = new Uint8Array([99, 123, 125]);
    await expect(unpack(toBase64Url(framed))).rejects.toThrow();
  });
});
