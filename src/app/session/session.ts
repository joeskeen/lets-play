import { IUser } from '../user/user';

export type GovernmentType = 'semi-direct democracy' | 'totalitarian';

export interface ISession {
  sessionName: string;
  sessionStartTimestamp: number;
  users: IUser[];
  supremeLeader: IUser;
  governmentType: GovernmentType;
  activeInitiatives: IInitiative[];
}

export interface IInitiative {
  initiativeType: string;
  champion: IUser;
  supporters: IUser[];
}
