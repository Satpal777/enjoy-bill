import { ChangeDetectionStrategy, Component, OnInit, OnDestroy, computed, inject, signal, effect } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Navigation } from "../../shared/components/navigation/navigation";
import { EmptyState } from "../../shared/components/empty-state/empty-state";
import { Modal } from "../../shared/components/modal/modal";
import { Group, Groups } from '../../core/services/supabase/groups';
import { Supabase } from '../../core/services/supabase';
import { FilterTabs } from '../components/filter-tabs/filter-tabs';
import { ExpenseCard, ExpenseCardData } from '../components/expense-card/expense-card';
import { MemberList } from '../components/member-list/member-list';
import { PendingInvitations } from '../../shared/components/models/modet.types';
import { ToolTipCard } from '../../shared/directive/tool-tip-card';
import { Expenses } from '../../core/services/supabase/expenses';
import { ExpenseDetails } from '../components/expense-details/expense-details';
import { SettleUpModal, SettlementData } from '../components/settle-up-modal/settle-up-modal';

interface Member {
  id: string;
  name: string;
  avatar?: string;
  joinedAt: string;
}

interface Balance {
  user_id: string;
  balance: number;
}

interface ExpenseDbPayload {
  group_id: string;
  description: string;
  total_amount: number;
  currency: string;
  category: string;
  paid_by: string;
  expense_date: string;
}

@Component({
  selector: 'app-expense-layout',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    Navigation,
    FilterTabs,
    EmptyState,
    ExpenseCard,
    MemberList,
    Modal,
    ToolTipCard,
    CurrencyPipe,
    DatePipe,
    ExpenseDetails,
    SettleUpModal
  ],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExpenseLayout implements OnInit, OnDestroy {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private groupsService = inject(Groups);
  private supabaseService = inject(Supabase);
  private expensesService = inject(Expenses);

  // UI State
  loading = signal<boolean>(true);
  isCreating = signal<boolean>(false);
  isInviting = signal<boolean>(false);
  loadingExpenseData = signal<boolean>(false);

  // Modal states
  showCreateModal = signal(false);
  showInviteModal = signal(false);
  showExpenseDetailModal = signal(false);
  showSettleUpModal = signal(false);
  selectedExpenseId = signal<string | null>(null);


  // Data
  selectedGroup = signal<Group | null>(null);
  expenses = signal<ExpenseCardData[]>([]);
  members = signal<Member[]>([]);
  balances = signal<Balance[]>([]);
  pendingInvites = signal<PendingInvitations[]>([]);

  // Create a signal from the current user observable
  userId = toSignal(this.supabaseService.currentUser$);

  // Forms
  expenseForm: FormGroup = this.fb.group({
    description: ['', Validators.required],
    amount: [null, [Validators.required, Validators.min(0.01)]],
    currency: ['INR', Validators.required],
    paidBy: [null, Validators.required],
    date: [new Date().toISOString().split('T')[0], Validators.required],
    isEdit: false,
    category: ['', Validators.required]
  });

  inviteForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  inviteError = signal<string | null>(null);
  inviteSuccess = signal<boolean>(false);
  invitedEmail = signal<string>('');
  linkCopied = signal<boolean>(false);

  // Filters
  activeFilter = signal<string>('all');
  filterOptions = [
    { value: 'all', label: 'All expenses' },
    { value: 'my', label: 'Lented' },
    { value: 'to_pay', label: 'Borrowed' },
    { value: 'settle_up', label: 'Settled' }
  ];

  // Computed
  totalSpent = computed(() =>
    this.expenses().reduce((sum, e) => sum + e.amount, 0)
  );

  myTotalShare = computed(() =>
    this.expenses().reduce((sum, expense) => sum + expense.myShare, 0)
  );

  showExpenses = computed(() => {
    switch (this.activeFilter()) {
      case 'my':
        return this.expenses().filter(e => e.isLent && !e.isSettlement);
      case 'to_pay':
        return this.expenses().filter(e => !e.isLent && !e.isSettlement);
      case 'settle_up':
        return this.expenses().filter(e => e.isSettlement);
      case 'all':
      default:
        return this.expenses();
    }
  });

  memberStats = computed(() => {
    const currentMembers = this.members();
    const currentBalances = this.balances();

    // Map to MemberStatData expected by member-list
    return currentMembers.map(member => ({
      id: member.id,
      name: member.name,
      avatar: member.avatar,
      initials: member.name.charAt(0).toUpperCase(),
      balanceAmount: currentBalances.find(b => b.user_id === member.id)?.balance || 0
    }));
  });

  updateChannelSubscription: (() => void) | undefined;

  get isEdit() {
    return this.expenseForm.get('isEdit')?.value;
  }

  ngOnInit() {
    const groupId = this.route.snapshot.paramMap.get('id');
    if (groupId) {
      this.loadData(groupId);
      const { unsubscribe, subscribe } = this.groupsService.subscribeToGroupChanges(groupId);
      this.updateChannelSubscription = unsubscribe;
      subscribe().subscribe((val) => {
        val && this.loadData(groupId);
        console.log(val);
      });
    }
  }

  ngOnDestroy() {
    this.updateChannelSubscription?.();
  }

  loadData(groupId: string) {
    this.loadGroupData(groupId);
    this.loadBalances(groupId);
  }

  async loadBalances(groupId: string) {
    const balances = await this.groupsService.getMemberBalances(groupId);
    this.balances.set(balances);
  }

  async loadGroupData(groupId: string) {
    this.loading.set(true);
    try {
      const { groupData, members, expenses, invites, errors } =
        await this.groupsService.getGroupDetails(groupId);

      if (errors?.members || errors?.expenses) return;

      this.selectedGroup.set(groupData);

      console.log(members)

      // Format Members
      const formattedMembers: Member[] = (members || []).map((m: any) => ({
        id: m.profiles.id,
        name: m.profiles.username || 'Unknown',
        avatar: m.profiles.avatar_url,
        joinedAt: m.joined_at
      }));
      this.members.set(formattedMembers);

      // Format Expenses
      const userData = this.userId(); // get current user

      this.expenses.set((expenses || []).map((e: any) => {
        const isPayer = e.payer?.id === userData?.id;
        const myConsumption = e.my_split?.[0]?.amount_owed || 0;

        // For settlements, show the full amount
        // For regular expenses, show the calculated share
        const displayAmount = e.is_settlement
          ? e.total_amount
          : (isPayer ? e.total_amount - myConsumption : myConsumption);

        return {
          id: e.id,
          title: e.description,
          amount: e.total_amount,
          currency: e.currency,
          date: new Date(e.expense_date),
          paidBy: isPayer ? 'You' : (e.payer?.username || 'Unknown'),
          payerId: e.payer?.id,
          category: e.category,
          isLent: isPayer,
          myShare: displayAmount,
          isSettlement: e.is_settlement
        };
      }));


      // Map invites to Member-like structure for the UI or use any[]
      this.pendingInvites.set((invites || []).map((i: any) => ({
        ...i,
        invitee_email: i.invitee_email // Keep specific fields needed for invite list
      })));

    } catch (error) {
      console.error(error);
    } finally {
      this.loading.set(false);
    }
  }

  async createExpense() {
    if (this.expenseForm.invalid) {
      this.expenseForm.markAllAsTouched();
      return;
    }

    this.isCreating.set(true);
    const formValues = this.expenseForm.value;
    const groupId = this.selectedGroup()?.id;

    if (groupId) {
      const dbPayload: ExpenseDbPayload = {
        group_id: groupId,
        description: formValues.description,
        total_amount: formValues.amount,
        currency: formValues.currency,
        category: formValues.category,
        paid_by: formValues.paidBy,
        expense_date: formValues.date,
      };

      const id = this.selectedExpenseId()
      if (formValues.isEdit && id) {
        await this.expensesService.updateExpense(id, dbPayload);
        this.selectedExpenseId.set(null);
      } else {
        await this.expensesService.createExpense(dbPayload);
      }
    }

    this.isCreating.set(false);
    this.showCreateModal.set(false);
    this.resetForm();
  }

  async inviteMember() {
    this.inviteError.set(null);

    if (this.inviteForm.invalid) {
      this.inviteForm.markAllAsTouched();
      return;
    }

    this.isInviting.set(true);
    const email = this.inviteForm.value.email;
    const groupId = this.selectedGroup()?.id;

    if (email === this.userId()?.email) {
      this.inviteError.set('You cannot invite yourself.');
      this.isInviting.set(false);
      return;
    }

    if (groupId) {
      try {
        await this.groupsService.inviteMember(groupId, email);
        this.showInviteModal.set(false);
        this.inviteForm.reset();
        this.loadGroupData(groupId); // Reload to show pending invite
      } catch (error: any) {
        console.error('Invite failed', error);
        this.inviteError.set(error.message || 'Failed to send invitation. Please try again.');
      }
    }

    this.isInviting.set(false);
  }

  openInviteModal() {
    this.inviteError.set(null);
    this.inviteForm.reset();
    this.showInviteModal.set(true);
  }

  openExpenseModal() {
    this.resetForm();
    this.showCreateModal.set(true);
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  openSettleUpModal() {
    this.showSettleUpModal.set(true);
  }

  async handleSettlement(settlement: SettlementData) {
    try {
      await this.groupsService.recordSettlement(settlement);
      this.showSettleUpModal.set(false);

      // Reload balances to reflect the settlement
      const groupId = this.route.snapshot.paramMap.get('id');
      if (groupId) {
        await this.loadBalances(groupId);
      }

      // Show success message (you can add a toast notification here)
      console.log('Settlement recorded successfully');
    } catch (error) {
      console.error('Error recording settlement:', error);
      // Show error message (you can add a toast notification here)
    }
  }

  resetForm() {
    const currentUserId = this.userId()?.id;
    this.expenseForm.reset({
      description: '',
      amount: null,
      currency: 'INR',
      date: new Date().toISOString().split('T')[0],
      category: '',
      paidBy: currentUserId || null,
      isEdit: false
    });
  }

  hasError(field: string): boolean {
    const control = this.expenseForm.get(field);
    return !!(control?.invalid && (control?.dirty || control?.touched));
  }

  filterExpenses = (filter: string) => {
    this.activeFilter.set(filter);
  }

  openExpenseDetail(id: string) {
    this.showExpenseDetailModal.set(true);
    this.selectedExpenseId.set(id);
  }

  closeExpenseDetailModal() {
    this.showExpenseDetailModal.set(false);
    this.selectedExpenseId.set(null);
  }

  refreshExpenses() {
    this.showExpenseDetailModal.set(false);
    this.selectedExpenseId.set(null);
    const groupId = this.selectedGroup()?.id;
    if (groupId) {
      this.loadData(groupId);
    }
  }

  async editExpenseDetail(expenseId: string) {
    this.expenseForm.patchValue({ isEdit: true });
    this.selectedExpenseId.set(expenseId);
    this.showCreateModal.set(true);
    this.loadingExpenseData.set(true);
    const expenses = await this.expensesService.getExpenseDetails(expenseId);
    this.expenseForm.patchValue({
      description: expenses.description,
      amount: expenses.total_amount,
      currency: expenses.currency,
      paidBy: expenses.paid_by_user?.id,
      date: new Date(expenses.created_at).toISOString().split('T')[0],
      category: expenses.category
    });
    this.loadingExpenseData.set(false);
  }

  async deleteExpenseDetail(expenseId: string) {
    const reply = confirm("Are you sure you want to delete expense");
    if (reply) {
      await this.expensesService.deleteExpense(expenseId);
      this.expenses.update((pre) => pre.filter((el) => el.id !== expenseId));
    }
  }

  async generateAndCopyLink() {
    const groupId = this.selectedGroup()?.id;
    if (!groupId) return;

    let { token } = await this.groupsService.inviteMember(groupId, null);

    const uri = `${window.location.origin}/invite/${token}`;

    navigator.clipboard.writeText(uri).then(() => {
      this.linkCopied.set(true);

      setTimeout(() => {
        this.closeInviteModal();
      }, 2000);

    }).catch(err => {
      console.error('Failed to copy link:', err);
      this.inviteError.set('Failed to copy link to clipboard. Please try again.');
    });
  }

  closeInviteModal() {
    this.showInviteModal.set(false);

    // Reset all states after modal close
    setTimeout(() => {
      this.inviteForm.reset();
      this.inviteError.set(null);
      this.inviteSuccess.set(false);
      this.invitedEmail.set('');
      this.linkCopied.set(false);
    }, 300);
  }
}
