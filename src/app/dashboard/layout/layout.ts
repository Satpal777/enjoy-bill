
import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Group, Groups } from '../../core/services/supabase/groups';
import { Supabase } from '../../core/services/supabase';
import { Navigation } from "../../shared/components/navigation/navigation";
import { NotificationDropdown } from "../../shared/components/notification-dropdown/notification-dropdown";
import { StatsCard } from "../../shared/components/stats-card/stats-card";
import { CurrencyPipe, DatePipe } from '@angular/common';
import { EmptyState } from "../../shared/components/empty-state/empty-state";
import { Modal } from "../../shared/components/modal/modal";
import { FormsModule } from '@angular/forms';
import { Invitation } from '../../shared/components/models/modet.types';
import { ProfileDropdown } from '../../shared/components/profile-dropdown/profile-dropdown';

@Component({
  selector: 'app-dashboard-layout',
  imports: [FormsModule, Navigation, NotificationDropdown, ProfileDropdown, StatsCard, DatePipe, EmptyState, Modal, CurrencyPipe],
  standalone: true,
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class DashboardLayout implements OnInit {
  // --- Signals ---
  groups = signal<Group[]>([]);
  loading = signal(true);
  showNotifications = signal(false);
  showProfilePopUp = signal(false);
  invitations = signal<Invitation[]>([]);
  showCreateModal = signal(false);
  isCreating = signal(false);
  newGroupName = signal('');
  newGroupDesc = signal('');
  totalYouOwe = signal(0);
  totalOwedToYou = signal(0);

  constructor(
    private groupsService: Groups,
    private router: Router,
    private supabase: Supabase
  ) { }

  async ngOnInit() {
    await Promise.all([
      this.loadGroups(),
      this.loadInvitations(),
      this.loadGlobalBalances()
    ]);
  }

  async loadGlobalBalances() {
    try {
      const balances = await this.groupsService.getGlobalBalances();
      this.totalYouOwe.set(balances.you_owe);
      this.totalOwedToYou.set(balances.owed_to_you);
    } catch (error) {
      console.error(error);
    }
  }

  async loadGroups() {
    try {
      this.loading.set(true);
      const data = await this.groupsService.getUserGroups();
      this.groups.set(data);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      this.loading.set(false);
    }
  }

  async createGroup() {
    if (!this.newGroupName().trim()) return;
    this.isCreating.set(true);
    try {
      await this.groupsService.createGroup(this.newGroupName(), this.newGroupDesc());
      this.showCreateModal.set(false);
      this.newGroupName.set('');
      this.newGroupDesc.set('');
      await this.loadGroups();
    } catch (error) {
      console.error('Error creating group:', error);
    } finally {
      this.isCreating.set(false);
    }
  }

  showExpenses(groupId: string) {
    this.router.navigate(['expenses', groupId]);
  }

  async loadInvitations() {
    try {
      const invites = await this.groupsService.getPendingInvitations();
      this.invitations.set(invites);
    } catch (error) {
      console.error('Error loading invites', error);
    }
  }

  async handleInviteResponse(event: { id: string, accept: boolean }) {
    try {
      if (event.accept) {
        await this.groupsService.acceptInvitation(event.id);
        await this.loadGroups();
      } else {
        await this.groupsService.rejectInvitation(event.id);
      }
      await this.loadInvitations();
    } catch (error) {
      console.error('Error responding to invite', error);
    }
  }

  logout() {
    this.supabase.signOut();
    this.router.navigate(['login']);
  }
}