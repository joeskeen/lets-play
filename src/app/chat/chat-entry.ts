import { IUser } from '../user/user';

export interface ChatEntry {
  message: string;
  user: IUser;
  timestamp: number;
}
