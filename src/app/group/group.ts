import { IUser } from '../user/user';

export type GovernmentType = 'semi-direct democracy' | 'totalitarian';

export interface IGroup {
  groupName: string;
  users: IUser[];
  supremeLeader: IUser;
  governmentType: GovernmentType;
  activeInitiatives: IInitiative[];
}

export interface IInitiative {
  uniqueId: string;
  initiativeType: string;
  champion: IUser;
  supporters: IUser[];
}
