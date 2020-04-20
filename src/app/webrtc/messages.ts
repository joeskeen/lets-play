import { IUser } from '../user/user';

export interface IMessage<T = any> {
  type: string;
  data: T;
}

export interface IUserMessage extends IMessage<IUser> {
  type: 'user';
  data: IUser;
}

export interface IChatMessage extends IMessage<string> {
  type: 'chat';
  data: string;
}
