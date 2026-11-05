/**
 * Game rules, as a pure reducer.
 *
 * `reduce` must be deterministic: no randomness, no clocks, no generated ids.
 * Every peer replays the same (state, action, actor) triple and lands on the
 * same state. Anything non-deterministic (ids, timestamps, shuffling) is
 * decided by the originating peer *before* the action is sent.
 *
 * The host is the only writer. Guests send `intent`s; the host validates,
 * applies, sequences and rebroadcasts. `reduce` doubles as that validator:
 * returning `null` means "rejected".
 */

export type Step = 'lobby' | 'writing' | 'guessing' | 'round-end' | 'game-over';

export interface Member {
  id: string;
  name: string;
  joinedAt: number;
}

export interface Player {
  id: string;
  name: string;
  score: number;
  guessed: boolean;
}

export interface Response {
  id: string;
  authorId: string;
  text: string;
  revealed: boolean;
}

export interface GameState {
  step: Step;
  round: number;
  players: Player[];
  /** Prompts still to be played, in order. */
  prompts: string[];
  prompt: string | null;
  responses: Response[];
  turnId: string | null;
}

export interface RoomState {
  id: string;
  name: string;
  hostId: string;
  members: Member[];
}

export interface SharedState {
  room: RoomState;
  game: GameState;
}

export type Action =
  | { type: 'room/join'; member: Member }
  | { type: 'room/leave'; memberId: string }
  | { type: 'room/rename'; name: string }
  | { type: 'game/start'; prompts: string[] }
  | { type: 'game/respond'; responseId: string; text: string }
  | { type: 'game/guess'; responseId: string; guessedId: string }
  | { type: 'game/next-round' }
  | { type: 'game/new' };

export const RESPONSE_MAX = 160;
export const PROMPT_MAX = 160;
export const ROOM_NAME_MAX = 40;

export function blankGame(): GameState {
  return {
    step: 'lobby',
    round: 0,
    players: [],
    prompts: [],
    prompt: null,
    responses: [],
    turnId: null,
  };
}

export function blankState(room: RoomState): SharedState {
  return { room, game: blankGame() };
}

export function hasResponded(game: GameState, playerId: string): boolean {
  return game.responses.some((response) => response.authorId === playerId);
}

export function playerById(
  game: GameState,
  playerId: string | null,
): Player | undefined {
  return playerId ? game.players.find((player) => player.id === playerId) : undefined;
}

export function responseById(
  game: GameState,
  responseId: string,
): Response | undefined {
  return game.responses.find((response) => response.id === responseId);
}

/** Number of players who still owe a response. */
export function waitingOn(game: GameState): number {
  return game.players.filter(
    (player) => !game.responses.some((r) => r.authorId === player.id),
  ).length;
}

export function sanitizeText(value: string, max: number): string {
  return value
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

export function shuffle<T>(items: readonly T[]): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = copy[i];
    const b = copy[j];
    if (a !== undefined && b !== undefined) {
      copy[i] = b;
      copy[j] = a;
    }
  }
  return copy;
}

function isHost(state: SharedState, actorId: string): boolean {
  return state.room.hostId === actorId;
}

function isMember(state: SharedState, actorId: string): boolean {
  return state.room.members.some((member) => member.id === actorId);
}

function isPlayer(state: SharedState, actorId: string): boolean {
  return state.game.players.some((player) => player.id === actorId);
}

/**
 * Finish the round. Everything still hidden is revealed so the table can see
 * who wrote the leftovers.
 */
function endRound(game: GameState): GameState {
  return {
    ...game,
    responses: game.responses.map((response) => ({
      ...response,
      revealed: true,
    })),
    step: 'round-end',
    turnId: null,
  };
}

/**
 * Advance to the next player who has not had their response guessed.
 * Returns a round end if nobody is eligible.
 */
function advanceTurn(game: GameState): GameState {
  const players = game.players;
  if (players.length === 0) return endRound(game);

  // If the current player is gone (they left mid-turn), start just before the
  // new first player so the turn follows the roster order instead of skipping
  // one.
  const currentIndex = players.findIndex((player) => player.id === game.turnId);
  const start = currentIndex >= 0 ? currentIndex : -1;

  for (let offset = 1; offset <= players.length; offset++) {
    const candidate = players[(start + offset) % players.length];
    if (candidate && !candidate.guessed && candidate.id !== game.turnId) {
      return { ...game, turnId: candidate.id };
    }
  }

  return endRound(game);
}

/**
 * Repair derived state after a player leaves: start guessing if everyone has
 * responded, and end the round if there is nobody left to take a turn.
 */
function normalize(game: GameState): GameState {
  if (game.step === 'writing') {
    // A solo player has nobody to guess, so do not enter the guessing phase.
    const everyone =
      game.players.length >= 2 &&
      game.players.every((player) =>
        game.responses.some((response) => response.authorId === player.id),
      );
    if (everyone) {
      const first = game.players[0];
      return { ...game, step: 'guessing', turnId: first ? first.id : null };
    }
  }

  if (game.step === 'guessing') {
    if (game.players.length < 2) return endRound(game);
    const turn = playerById(game, game.turnId);
    if (!turn) return advanceTurn(game);
  }

  return game;
}

function startRound(
  state: SharedState,
  prompts: string[],
  round: number,
): SharedState | null {
  const prompt = prompts[0];
  if (!prompt) return null;

  const players: Player[] = state.room.members.map((member) => {
    const previous = state.game.players.find((p) => p.id === member.id);
    return {
      id: member.id,
      name: member.name,
      score: previous ? previous.score : 0,
      guessed: false,
    };
  });

  if (players.length < 1) return null;

  return {
    ...state,
    game: {
      step: 'writing',
      round,
      players,
      prompts: prompts.slice(1),
      prompt,
      responses: [],
      turnId: null,
    },
  };
}

/**
 * Apply an action. Returns the next state, or `null` if the action is illegal
 * for this actor. The host uses `null` to reject guest intents.
 */
export function reduce(
  state: SharedState,
  action: Action,
  actorId: string,
): SharedState | null {
  switch (action.type) {
    case 'room/join': {
      if (!isHost(state, actorId)) return null;
      if (!action.member || typeof action.member.id !== 'string') return null;
      if (state.room.members.some((member) => member.id === action.member.id)) {
        return state;
      }
      if (state.room.members.length >= 16) return null;

      const member: Member = {
        id: action.member.id,
        name: sanitizeText(action.member.name, 64) || 'Player',
        joinedAt:
          typeof action.member.joinedAt === 'number'
            ? action.member.joinedAt
            : Date.now(),
      };

      return {
        ...state,
        room: { ...state.room, members: [...state.room.members, member] },
      };
    }

    case 'room/leave': {
      if (!isHost(state, actorId)) return null;
      const members = state.room.members.filter(
        (member) => member.id !== action.memberId,
      );
      if (members.length === state.room.members.length) return state;

      let game: GameState = {
        ...state.game,
        players: state.game.players.filter(
          (player) => player.id !== action.memberId,
        ),
        // An orphaned answer would be unguessable: drop it with its author.
        responses: state.game.responses.filter(
          (response) => response.authorId !== action.memberId,
        ),
      };
      if (game.turnId === action.memberId) game = advanceTurn(game);
      game = normalize(game);

      return { ...state, room: { ...state.room, members }, game };
    }

    case 'room/rename': {
      if (!isHost(state, actorId)) return null;
      const name = sanitizeText(action.name, ROOM_NAME_MAX);
      if (!name) return null;
      return { ...state, room: { ...state.room, name } };
    }

    case 'game/start': {
      if (!isHost(state, actorId)) return null;
      if (state.room.members.length < 2) return null;
      const prompts = action.prompts
        .map((prompt) => sanitizeText(prompt, PROMPT_MAX))
        .filter(Boolean)
        .slice(0, 100);
      if (prompts.length === 0) return null;
      return startRound(state, prompts, 1);
    }

    case 'game/respond': {
      if (!isMember(state, actorId) || !isPlayer(state, actorId)) return null;
      const game = state.game;
      if (game.step !== 'writing') return null;
      if (hasResponded(game, actorId)) return null;
      if (typeof action.responseId !== 'string' || !action.responseId) return null;
      if (game.responses.some((response) => response.id === action.responseId)) {
        return null;
      }

      const text = sanitizeText(action.text, RESPONSE_MAX);
      if (!text) return null;

      const responses: Response[] = [
        ...game.responses,
        { id: action.responseId, authorId: actorId, text, revealed: false },
      ];

      return {
        ...state,
        game: normalize({ ...game, responses }),
      };
    }

    case 'game/guess': {
      if (!isMember(state, actorId) || !isPlayer(state, actorId)) return null;
      const game = state.game;
      if (game.step !== 'guessing') return null;
      if (game.turnId !== actorId) return null;

      const response = responseById(game, action.responseId);
      if (!response || response.revealed) return null;
      if (response.authorId === actorId) return null;

      const guessed = game.players.find((p) => p.id === action.guessedId);
      if (!guessed || guessed.id === actorId) return null;
      // Their response is already on the board.
      if (guessed.guessed) return null;

      if (response.authorId !== action.guessedId) {
        return { ...state, game: advanceTurn(game) };
      }

      const responses = game.responses.map((r) =>
        r.id === response.id ? { ...r, revealed: true } : r,
      );
      const players = game.players.map((p) =>
        p.id === action.guessedId
          ? { ...p, guessed: true }
          : p.id === actorId
            ? { ...p, score: p.score + 1 }
            : p,
      );

      let next: GameState = { ...game, responses, players };

      const remaining = responses.filter(
        (r) => !r.revealed && r.authorId !== actorId,
      );
      if (remaining.length === 0) {
        next = endRound(next);
      }

      return { ...state, game: next };
    }

    case 'game/next-round': {
      if (!isHost(state, actorId)) return null;
      if (state.game.step !== 'round-end' && state.game.step !== 'game-over') {
        return null;
      }
      if (state.room.members.length < 2) return null;
      if (state.game.prompts.length === 0) {
        return { ...state, game: { ...state.game, step: 'game-over' } };
      }
      return startRound(state, state.game.prompts, state.game.round + 1);
    }

    case 'game/new': {
      if (!isHost(state, actorId)) return null;
      return { ...state, game: blankGame() };
    }

    default:
      return null;
  }
}
