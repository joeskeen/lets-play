import { parseWire, serialize } from './protocol';
import type { Wire } from './protocol';

describe('protocol', () => {
  it('parses a hello', () => {
    const message: Wire = {
      t: 'hello',
      v: 1,
      room: 'room',
      identity: { id: 'a', name: 'Ada' },
    };
    expect(parseWire(serialize(message))).toEqual(message);
  });

  it('parses a signal', () => {
    const message: Wire = {
      t: 'signal',
      id: 'signal-1',
      from: 'a',
      to: 'b',
      payload: { k: 'ice', candidate: { candidate: 'candidate:1' } },
    };
    expect(parseWire(serialize(message))).toEqual(message);
  });

  it('rejects malformed input', () => {
    expect(parseWire('')).toBeNull();
    expect(parseWire('not json')).toBeNull();
    expect(parseWire('{"t":"mystery"}')).toBeNull();
    expect(parseWire('[]')).toBeNull();
  });

  it('rejects malformed signals', () => {
    expect(
      parseWire(
        JSON.stringify({
          t: 'signal',
          id: 's',
          from: 'a',
          to: 'b',
          payload: { k: 'nope' },
        }),
      ),
    ).toBeNull();

    expect(
      parseWire(
        JSON.stringify({
          t: 'signal',
          id: 's',
          from: 'a',
          to: 'b',
          payload: { k: 'sdp', type: 'offer', sdp: '' },
        }),
      ),
    ).toBeNull();
  });

  it('normalizes resync', () => {
    expect(parseWire('{"t":"resync"}')).toEqual({ t: 'resync' });
  });
});
