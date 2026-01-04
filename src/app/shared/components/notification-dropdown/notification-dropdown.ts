import { Component, input, output } from '@angular/core';
import { Invitation } from '../models/modet.types';


@Component({
  selector: 'app-notification-dropdown',
  imports: [],
  templateUrl: './notification-dropdown.html',
  styleUrl: './notification-dropdown.css',
})
export class NotificationDropdown {
  isOpen = input(false);
  invitations = input<Invitation[]>([]);

  close = output<void>();
  respond = output<{ id: string, accept: boolean }>();
}
