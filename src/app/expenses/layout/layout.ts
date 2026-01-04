import { Component, OnInit, OnDestroy, computed, inject, signal } from '@angular/core';
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
import { Invitation, PendingInvitations } from '../../shared/components/models/modet.types';
import { ToolTipCard } from '../../shared/directive/tool-tip-card';
import { Expenses } from '../../core/services/supabase/expenses';
import { FormInput } from "../components/form-input/form-input";
import { ExpenseDetails } from '../components/expense-details/expense-details';

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
  standalone: true,
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
    ExpenseDetails,
    CurrencyPipe,
    DatePipe,
    ToolTipCard
  ],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
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
  showCreateModal = signal<boolean>(false);
  showInviteModal = signal<boolean>(false);
  showExpenseDetailModal = signal<boolean>(false);
  loadingExpenseData = signal<boolean>(false);


  // Data
  selectedExpenseId = signal<string | null>(null);
  selectedGroup = signal<Group | null>(null);
  expenses = signal<ExpenseCardData[]>([]);
  members = signal<Member[]>([]);
  balances = signal<Balance[]>([]);
  pendingInvites = signal<PendingInvitations[]>([]);

  // Create a signal from the current user observable
  userId = toSignal(this.supabaseService.currentUser$);

  // Forms
  expenseForm: FormGroup;
  inviteForm: FormGroup;
  inviteError = signal<string | null>(null);

  // Filters
  activeFilter = signal<string>('all');
  filterOptions = [
    { value: 'all', label: 'All expenses' },
    { value: 'my', label: 'My expenses' },
    { value: 'to_pay', label: 'To pay' }
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
        return this.expenses().filter(e => e.myShare > 0);
      case 'to_pay':
        return this.expenses().filter(e => !e.isLent);
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
      initials: member.name.charAt(0).toUpperCase(),
      balanceAmount: currentBalances.find(b => b.user_id === member.id)?.balance || 0
    }));
  });

  updateChannelSubscription: any;

  constructor() {
    // Expense Form
    this.expenseForm = this.fb.group({
      description: ['', Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      currency: ['INR', Validators.required],
      paidBy: [null, Validators.required],
      date: [new Date().toISOString().split('T')[0], Validators.required],
      isEdit: false,
      category: ['', Validators.required]
    });

    // Invite Form
    this.inviteForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  get isEdit() {
    return this.expenseForm.get('isEdit')?.value;
  }

  ngOnInit() {
    const groupId = this.route.snapshot.paramMap.get('id');
    if (groupId) {
      this.loadData(groupId);
      const { unsubscribe, subscribe } = this.groupsService.subscribeToGroupChanges(groupId);
      this.updateChannelSubscription = unsubscribe;
      subscribe().subscribe((val) => { val && this.loadData(groupId); });
    }
  }

  ngOnDestroy() {
    this.updateChannelSubscription?.();
  }

  loadData(groupId: string) {
    console.log("loading...")
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

      // Format Members
      const formattedMembers: Member[] = (members || []).map((m: any) => ({
        id: m.profiles.id,
        name: m.profiles.display_name || 'Unknown',
        avatar: m.profiles.avatar_url,
        joinedAt: m.joined_at
      }));
      this.members.set(formattedMembers);

      // Format Expenses
      const userData = this.userId(); // get current user

      this.expenses.set((expenses || []).map((e: any) => {
        const isPayer = e.payer?.id === userData?.id;
        const myConsumption = e.my_split?.[0]?.amount_owed || 0;
        const displayAmount = isPayer ? e.total_amount - myConsumption : myConsumption;

        return {
          id: e.id,
          title: e.description,
          amount: e.total_amount,
          currency: e.currency,
          date: new Date(e.expense_date),
          paidBy: isPayer ? 'You' : (e.payer?.display_name || 'Unknown'),
          payerId: e.payer?.id,
          category: e.category,
          isLent: isPayer,
          myShare: displayAmount
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
    console.log(this.expenseForm.value)
    this.loadingExpenseData.set(false);
  }

  async deleteExpenseDetail(expenseId: string) {
    const reply = confirm("Are you sure you want to delete expense");
    if (reply) {
      await this.expensesService.deleteExpense(expenseId);
      this.expenses.update((pre) => pre.filter((el) => el.id !== expenseId));
    }
  }
}
