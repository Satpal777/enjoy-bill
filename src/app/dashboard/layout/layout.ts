import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Group, Groups } from '../../core/services/supabase/groups';
import { Navigation } from "../../shared/components/navigation/navigation";
import { StatsCard } from "../../shared/components/stats-card/stats-card";
import { CurrencyPipe, DatePipe } from '@angular/common';
import { EmptyState } from "../../shared/components/empty-state/empty-state";
import { Modal } from "../../shared/components/modal/modal";
import { FormsModule } from '@angular/forms';
import { Supabase } from '../../core/services/supabase';

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
  private supabase = inject(Supabase);

  // --- Signals ---
  groups = signal<Group[]>([]);
  loading = signal(true);
  showCreateModal = signal(false);
  isCreating = signal(false);
  newGroupName = signal('');
  newGroupDesc = signal('');
  totalYouOwe = signal(0);
  totalOwedToYou = signal(0);

  // Icon selection
  selectedIcon = signal<string | null>(null);
  showIconSelector = signal(false);
  uploadingIcon = signal(false);
  predefinedIcons = signal<string[]>([
    '🏠', '🎉', '✈️', '🍕', '💼', '🎓', '🏋️', '🎮', '📚', '🎵',
    '🏖️', '🎬', '⚽', '🎨', '🍺', '☕', '🏃', '🎯', '🎪', '🎭'
  ]);

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

  selectIcon(icon: string) {
    this.selectedIcon.set(icon);
    this.showIconSelector.set(false);
  }

  async onIconUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;

    const file = input.files[0];
    try {
      this.uploadingIcon.set(true);
      const userId = this.supabase.getCurrentUserId();
      if (!userId) throw new Error('No user ID');

      const fileName = `group_${Date.now()}.${file.name.split('.').pop()}`;
      const filePath = `${userId}/${fileName}`;

      const { data, error: uploadError } = await this.supabase.getSupabaseClient()
        .storage
        .from('group_icons')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = this.supabase.getSupabaseClient()
        .storage
        .from('group_icons')
        .getPublicUrl(filePath);

      this.selectedIcon.set(publicUrl);
      this.showIconSelector.set(false);
    } catch (error) {
      console.error('Error uploading icon:', error);
      alert('Failed to upload icon. Please try again.');
    } finally {
      this.uploadingIcon.set(false);
    }
  }

  async createGroup() {
    if (!this.newGroupName().trim()) return;
    this.isCreating.set(true);
    try {
      await this.groupsService.createGroup(
        this.newGroupName(),
        this.newGroupDesc(),
        this.selectedIcon() || undefined
      );
      this.showCreateModal.set(false);
      this.newGroupName.set('');
      this.newGroupDesc.set('');
      this.selectedIcon.set(null);
      await this.loadGroups();
    } catch (error) {
      console.error('Error creating group:', error);
    } finally {
      this.isCreating.set(false);
    }
  }

  // Delete group
  groupToDelete = signal<string | null>(null);
  groupToDeleteName = computed(() => {
    const groupId = this.groupToDelete();
    if (!groupId) return '';
    return this.groups().find(g => g.id === groupId)?.name || '';
  });
  isDeleting = signal(false);

  confirmDelete(groupId: string, event: Event) {
    event.stopPropagation(); // Prevent navigation to group
    this.groupToDelete.set(groupId);
  }

  cancelDelete() {
    this.groupToDelete.set(null);
  }

  async deleteGroup() {
    const groupId = this.groupToDelete();
    if (!groupId) return;

    this.isDeleting.set(true);
    try {
      await this.groupsService.deleteGroup(groupId);
      this.groupToDelete.set(null);
      await this.loadGroups();
    } catch (error: any) {
      console.error('Error deleting group:', error);
      alert(error.message || 'Failed to delete group. Please try again.');
    } finally {
      this.isDeleting.set(false);
    }
  }

  showExpenses(groupId: string) {
    this.router.navigate(['expenses', groupId]);
  }
}
