

import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Group, Groups } from '../../core/services/supabase/groups';
import { Navigation } from "../../shared/components/navigation/navigation";
import { StatsCard } from "../../shared/components/stats-card/stats-card";
import { CurrencyPipe, DatePipe } from '@angular/common';
import { EmptyState } from "../../shared/components/empty-state/empty-state";
import { Modal } from "../../shared/components/modal/modal";
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dashboard-layout',
  imports: [FormsModule, Navigation, StatsCard, DatePipe, EmptyState, Modal, CurrencyPipe],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardLayout implements OnInit {
  private groupsService = inject(Groups);
  private router = inject(Router);

  // --- Signals ---
  groups = signal<Group[]>([]);
  loading = signal(true);
  showCreateModal = signal(false);
  isCreating = signal(false);
  newGroupName = signal('');
  newGroupDesc = signal('');
  totalYouOwe = signal(0);
  totalOwedToYou = signal(0);

  async ngOnInit() {
    await Promise.all([
      this.loadGroups(),
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
}