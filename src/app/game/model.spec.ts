import { blankState, reduce, waitingOn } from './model';
import type { Action, SharedState } from './model';

function makeState(): SharedState {
  return blankState({
    id: 'room',
    name: 'Test room',
    hostId: 'a',
    members: [
      { id: 'a', name: 'Ada', joinedAt: 1 },
      { id: 'b', name: 'Bo', joinedAt: 2 },
      { id: 'c', name: 'Cy', joinedAt: 3 },
    ],
  });
}

function apply(state: SharedState, action: Action, actor = 'a'): SharedState {
  const next = reduce(state, action, actor);
  if (!next) throw new Error(`Rejected ${action.type} for ${actor}`);
  return next;
}

function start(): SharedState {
  return apply(makeState(), {
    type: 'game/start',
    prompts: ['First prompt', 'Second prompt'],
  });
}

function writeAll(state: SharedState): SharedState {
  let next = state;
  for (const player of state.game.players) {
    next = apply(
      next,
      {
        type: 'game/respond',
        responseId: `r-${state.game.round}-${player.id}`,
        text: `${player.name} says ${state.game.round}`,
      },
      player.id,
    );
  }
  return next;
}

function finishRound(state: SharedState): SharedState {
  let next = writeAll(state);
  let guard = 0;
  while (next.game.step === 'guessing' && guard++ < 20) {
    const turn = next.game.turnId;
    if (!turn) break;
    const target = next.game.responses.find(
      (response) => !response.revealed && response.authorId !== turn,
    );
    if (!target) break;
    next = apply(
      next,
      {
        type: 'game/guess',
        responseId: target.id,
        guessedId: target.authorId,
      },
      turn,
    );
  }
  return next;
}

describe('game model', () => {
  it('starts a round with every member as a player', () => {
    const state = start();
    expect(state.game.step).toBe('writing');
    expect(state.game.round).toBe(1);
    expect(state.game.prompt).toBe('First prompt');
    expect(state.game.prompts).toEqual(['Second prompt']);
    expect(state.game.players.map((player) => player.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('moves to guessing when everyone has answered', () => {
    let state = start();
    state = apply(
      state,
      { type: 'game/respond', responseId: 'r-a', text: 'Apple' },
      'a',
    );
    expect(state.game.step).toBe('writing');
    expect(waitingOn(state.game)).toBe(2);

    state = apply(
      state,
      { type: 'game/respond', responseId: 'r-b', text: 'Banana' },
      'b',
    );
    state = apply(
      state,
      { type: 'game/respond', responseId: 'r-c', text: 'Cherry' },
      'c',
    );

    expect(state.game.step).toBe('guessing');
    expect(state.game.turnId).toBe('a');
    expect(waitingOn(state.game)).toBe(0);
  });

  it('keeps the turn on a correct guess and ends the round cleanly', () => {
    let state = writeAll(start());

    state = apply(
      state,
      { type: 'game/guess', responseId: 'r-1-b', guessedId: 'b' },
      'a',
    );
    expect(state.game.step).toBe('guessing');
    expect(state.game.turnId).toBe('a');
    expect(state.game.players.find((p) => p.id === 'a')?.score).toBe(1);
    expect(state.game.players.find((p) => p.id === 'b')?.guessed).toBe(true);
    expect(state.game.responses.find((r) => r.id === 'r-1-b')?.revealed).toBe(
      true,
    );

    state = apply(
      state,
      { type: 'game/guess', responseId: 'r-1-c', guessedId: 'c' },
      'a',
    );
    expect(state.game.step).toBe('round-end');
    expect(state.game.turnId).toBeNull();
    expect(state.game.players.find((p) => p.id === 'a')?.score).toBe(2);
    expect(state.game.responses.every((response) => response.revealed)).toBe(
      true,
    );
  });

  it('passes the turn after a wrong guess', () => {
    let state = writeAll(start());

    state = apply(
      state,
      { type: 'game/guess', responseId: 'r-1-b', guessedId: 'c' },
      'a',
    );

    expect(state.game.step).toBe('guessing');
    expect(state.game.turnId).toBe('b');
    expect(state.game.responses.find((r) => r.id === 'r-1-b')?.revealed).toBe(
      false,
    );
    expect(state.game.players.find((p) => p.id === 'a')?.score).toBe(0);
  });

  it('refuses out-of-turn guesses and host-only actions', () => {
    const started = start();
    const guessing = writeAll(started);

    expect(
      reduce(
        guessing,
        { type: 'game/guess', responseId: 'r-1-b', guessedId: 'b' },
        'b',
      ),
    ).toBeNull();

    expect(
      reduce(makeState(), { type: 'game/start', prompts: ['x'] }, 'b'),
    ).toBeNull();

    expect(
      reduce(makeState(), { type: 'room/rename', name: 'Nope' }, 'b'),
    ).toBeNull();

    expect(
      reduce(
        started,
        { type: 'game/respond', responseId: 'r-a', text: 'One' },
        'a',
      ),
    ).not.toBeNull();

    const answered = apply(
      started,
      { type: 'game/respond', responseId: 'r-a', text: 'One' },
      'a',
    );
    expect(
      reduce(
        answered,
        { type: 'game/respond', responseId: 'r-b', text: 'Two' },
        'a',
      ),
    ).toBeNull();
  });

  it('rejects guessing your own answer', () => {
    const guessing = writeAll(start());
    expect(
      reduce(
        guessing,
        { type: 'game/guess', responseId: 'r-1-a', guessedId: 'b' },
        'a',
      ),
    ).toBeNull();
  });

  it('advances rounds and ends the game when prompts run out', () => {
    const roundOne = finishRound(start());
    expect(roundOne.game.step).toBe('round-end');

    const roundTwo = apply(roundOne, { type: 'game/next-round' });
    expect(roundTwo.game.round).toBe(2);
    expect(roundTwo.game.prompt).toBe('Second prompt');
    expect(roundTwo.game.prompts).toEqual([]);
    expect(roundTwo.game.players.find((p) => p.id === 'a')?.score).toBe(2);

    const finished = finishRound(roundTwo);
    const over = apply(finished, { type: 'game/next-round' });
    expect(over.game.step).toBe('game-over');
  });

  it('can move on when a player leaves mid-writing', () => {
    let state = start();
    state = apply(
      state,
      { type: 'game/respond', responseId: 'r-a', text: 'Apple' },
      'a',
    );
    state = apply(
      state,
      { type: 'game/respond', responseId: 'r-b', text: 'Banana' },
      'b',
    );
    expect(state.game.step).toBe('writing');

    state = apply(state, { type: 'room/leave', memberId: 'c' });
    expect(state.game.players.map((player) => player.id)).toEqual(['a', 'b']);
    expect(state.game.step).toBe('guessing');
    expect(state.game.turnId).toBe('a');
  });

  it('removes a departed player’s answer from the board', () => {
    let state = writeAll(start());
    state = apply(state, { type: 'room/leave', memberId: 'b' });

    expect(state.game.responses.some((r) => r.authorId === 'b')).toBe(false);
    expect(state.game.players.some((p) => p.id === 'b')).toBe(false);
  });

  it('needs at least two players to start or continue', () => {
    const solo = blankState({
      id: 'room',
      name: 'Solo',
      hostId: 'a',
      members: [{ id: 'a', name: 'Ada', joinedAt: 1 }],
    });

    expect(
      reduce(solo, { type: 'game/start', prompts: ['x'] }, 'a'),
    ).toBeNull();
  });

  it('ends the round if only one player is left during guessing', () => {
    let state = writeAll(start());
    expect(state.game.step).toBe('guessing');

    state = apply(state, { type: 'room/leave', memberId: 'b' });
    expect(state.game.step).toBe('guessing');

    state = apply(state, { type: 'room/leave', memberId: 'c' });
    expect(state.game.step).toBe('round-end');
    expect(state.game.responses.every((response) => response.revealed)).toBe(
      true,
    );
  });

  it('cleans room names and rejects blank ones', () => {
    const state = apply(makeState(), {
      type: 'room/rename',
      name: '   Friday   night  ',
    });
    expect(state.room.name).toBe('Friday night');

    expect(
      reduce(makeState(), { type: 'room/rename', name: '   ' }, 'a'),
    ).toBeNull();
  });
});
