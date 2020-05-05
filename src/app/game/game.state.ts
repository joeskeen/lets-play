import { IUser } from '../user/user';

export interface GameState {
  players: Array<{ user: IUser; score: number }>;
  prompts: string[];
  step: Steps;
  currentPrompt: string;
  responses: IResponse[];
}

export interface IResponse {
  user: IUser;
  response: string;
  revealed: boolean;
}

export type Steps = 'NOT_STARTED' | 'WAITING_FOR_RESPONSES' | 'WAITING_FOR_PLAYER' | 'GAME_OVER';
