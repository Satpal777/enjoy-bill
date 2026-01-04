import { Component, input } from '@angular/core';
import { PendingInvitations } from '../../models/modet.types';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-invitee-card',
  imports: [DatePipe],
  templateUrl: './invitee-card.html',
  styleUrl: './invitee-card.css',
})
export class InviteeCard {
  invite = input.required<PendingInvitations>();
}
