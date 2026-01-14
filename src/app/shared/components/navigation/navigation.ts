import { ChangeDetectionStrategy, Component, inject, input, OnInit, output, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Supabase } from '../../../core/services/supabase';
import { Groups } from '../../../core/services/supabase/groups';
import { NotificationDropdown } from '../notification-dropdown/notification-dropdown';
import { ProfileDropdown, UserProfile } from '../profile-dropdown/profile-dropdown';
import { Invitation } from '../models/modet.types';
import { toSignal } from '@angular/core/rxjs-interop';

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
  userProfile = signal<UserProfile | null>(null);

  // Computed
  notificationCount = signal(0);
  currentUser = toSignal(this.supabase.currentUser$);

  async ngOnInit() {
    await this.loadInvitations();
    await this.loadUserProfile();
  }

  async loadUserProfile() {
    try {
      const user = this.supabase.getCurrentUser();
      if (user) {
        const profile = await this.supabase.getProfile(user.id);
        this.userProfile.set({
          id: user.id,
          username: profile.username || user.email?.split('@')[0] || 'User',
          email: user.email || '',
          avatar_url: profile.avatar_url,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at
        });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  }

  handleAvatarUpdate(newAvatarUrl: string) {
    // Update the local profile state with new avatar
    const currentProfile = this.userProfile();
    if (currentProfile) {
      this.userProfile.set({
        ...currentProfile,
        avatar_url: newAvatarUrl
      });
    }
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
    this.router.navigate(['/home']);
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
