import { Component, Input } from '@angular/core';
import { IUser } from '../user';

@Component({
  selector: 'app-user-icon',
  templateUrl: 'user-icon.component.html',
  styleUrls: ['user-icon.component.scss'],
})
export class UserIconComponent {
  @Input()
  user: IUser;
}
