// invitation-page.component.ts
import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Groups } from '../core/services/supabase/groups';
import { Supabase } from '../core/services/supabase';

@Component({
  selector: 'app-invitation-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './invite-handler.html',
})
export class InviteHandler implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private groupsService = inject(Groups);
  private supabase = inject(Supabase);

  // State signals
  isValidating = signal(true);
  inviteValid = signal(false);
  isAccepting = signal(false);
  errorMessage = signal('');

  // Invitation data
  groupId = signal('');
  inviteCode = signal('');
  groupName = signal('');
  initerName = signal('');

  ngOnInit() {
    // Get invite parameters from route
    this.route.paramMap.subscribe(params => {
      const inviteCode = params.get('code');

      if (inviteCode) {
        this.inviteCode.set(inviteCode);
        this.validateInvitation(inviteCode);
      } else {
        this.handleInvalidInvite('Invalid invitation link format.');
      }
    });
  }

  /**
   * Validate the invitation link
   */
  async validateInvitation(inviteCode: string) {
    try {
      const email = (await this.supabase.getUser()).data.user?.email;
      if (!email) return this.handleInvalidInvite("Invalid Session");

      const result = await this.groupsService.validateInvitation(inviteCode);
      if (result.valid) {
        this.groupName.set(result.groupName);
        this.initerName.set(result.inviterName || 'Someone');
        this.inviteValid.set(true);
      } else {
        this.handleInvalidInvite(result.message || 'This invitation is no longer valid.');
      }
    } catch (error: any) {
      console.error('Validation error:', error);
      this.handleInvalidInvite(error.message || 'Failed to validate invitation.');
    } finally {
      this.isValidating.set(false);
    }
  }

  /**
   * Handle invalid invitation
   */
  handleInvalidInvite(message: string) {
    this.isValidating.set(false);
    this.inviteValid.set(false);
    this.errorMessage.set(message);
  }

  /**
   * Accept the invitation
   */
  async acceptInvitation() {
    this.isAccepting.set(true);

    try {
      // Call your API to accept the invitation
      // Replace with your actual service method
      const { group_id } = await this.groupsService.acceptOneTimeInvitation(this.inviteCode());

      // Navigate to the group page after successful acceptance
      this.router.navigate(['/expenses', group_id]);
    } catch (error: any) {
      console.error('Accept error:', error);
      this.errorMessage.set(error.message || 'Failed to accept invitation.');
      this.inviteValid.set(false);
    } finally {
      this.isAccepting.set(false);
    }
  }

  /**
   * Decline the invitation
   */
  declineInvitation() {
    // Optionally call API to track declined invitations
    this.goToDashboard();
  }

  /**
   * Navigate to dashboard
   */
  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }
}