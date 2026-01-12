import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Invitation } from '../models/modet.types';


@Component({
  selector: 'app-notification-dropdown',
  imports: [],
  templateUrl: './notification-dropdown.html',
  styleUrl: './notification-dropdown.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationDropdown {
  invitations = input<Invitation[]>([]);
  close = output<void>();
  respond = output<{ id: string, accept: boolean }>();
}
