import { ChangeDetectionStrategy, Component, inject, input, OnInit, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Supabase } from '../../../core/services/supabase';
import { Groups } from '../../../core/services/supabase/groups';
import { NotificationDropdown } from '../notification-dropdown/notification-dropdown';
import { ProfileDropdown } from '../profile-dropdown/profile-dropdown';
import { Invitation } from '../models/modet.types';

@Component({
  selector: 'app-navigation',
  imports: [NotificationDropdown, ProfileDropdown],
  templateUrl: './navigation.html',
  styleUrl: './navigation.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Navigation implements OnInit {
  // Inputs
  title = input('');
  subtitle = input('');
  showBackButton = input(false);
  badge = input('');

  // Outputs
  backClick = output<void>();

  // Services
  private router = inject(Router);
  private supabase = inject(Supabase);
  private groupsService = inject(Groups);

  // Internal state
  showNotifications = signal(false);
  showProfilePopUp = signal(false);
  invitations = signal<Invitation[]>([]);

  // Computed
  notificationCount = signal(0);

  async ngOnInit() {
    await this.loadInvitations();
  }

  async loadInvitations() {
    try {
      const invites = await this.groupsService.getPendingInvitations();
      this.invitations.set(invites);
      this.notificationCount.set(invites.length);
    } catch (error) {
      console.error('Error loading invitations:', error);
    }
  }

  async handleInviteResponse(event: { id: string, accept: boolean }) {
    try {
      if (event.accept) {
        await this.groupsService.acceptInvitation(event.id);
      } else {
        await this.groupsService.rejectInvitation(event.id);
      }
      await this.loadInvitations();
    } catch (error) {
      console.error('Error handling invitation:', error);
    }
  }

  async logout() {
    await this.supabase.signOut();
    this.router.navigate(['/login']);
  }

  onBackClick() {
    this.backClick.emit();
  }

  toggleNotifications() {
    this.showNotifications.set(!this.showNotifications());
    if (this.showNotifications()) {
      this.showProfilePopUp.set(false);
    }
  }

  toggleProfile() {
    this.showProfilePopUp.set(!this.showProfilePopUp());
    if (this.showProfilePopUp()) {
      this.showNotifications.set(false);
    }
  }
}
