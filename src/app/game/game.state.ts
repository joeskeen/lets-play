import { IUser } from '../user/user';

export const gameFeatureKey = 'game';

export interface GameState {
  players: Array<{ user: IUser; score: number; guessed: boolean; }>;
  prompts: string[];
  step: Steps;
  currentPrompt: string;
  currentTurn?: IUser;
  responses: IResponse[];
}

export interface IResponse {
  user: IUser;
  response: string;
  revealed: boolean;
}

export type Steps =
  | 'NOT_STARTED'
  | 'WAITING_FOR_RESPONSES'
  | 'WAITING_FOR_GUESS'
  | 'ROUND_END'
  | 'GAME_OVER';
