import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Modal } from '../../../shared/components/modal/modal';
import { ExpenseCardData } from '../expense-card/expense-card';

interface Member {
    id: string;
    name: string;
    avatar?: string;
    joinedAt: string;
}

export interface ExpenseFormData {
    description: string;
    amount: number;
    currency: string;
    paidBy: string;
    date: string;
    category: string;
}

@Component({
    selector: 'app-expense-form-modal',
    imports: [Modal, ReactiveFormsModule],
    templateUrl: './expense-form-modal.html',
    styleUrl: './expense-form-modal.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExpenseFormModal {
    private fb = inject(FormBuilder);

    // Inputs
    isOpen = input<boolean>(false);
    members = input<Member[]>([]);
    groupId = input<string>('');
    expenseToEdit = input<ExpenseCardData | null>(null);

    // Outputs
    close = output<void>();
    save = output<ExpenseFormData>();

    // State
    isSubmitting = signal(false);

    // Form
    expenseForm: FormGroup = this.fb.group({
        description: ['', Validators.required],
        amount: [null, [Validators.required, Validators.min(0.01)]],
        currency: ['INR', Validators.required],
        paidBy: [null, Validators.required],
        date: [new Date().toISOString().split('T')[0], Validators.required],
        category: ['', Validators.required]
    });

    // Computed
    isEditMode = computed(() => this.expenseToEdit() !== null);
    modalTitle = computed(() => this.isEditMode() ? 'Edit Expense' : 'Add New Expense');
    submitButtonText = computed(() => this.isEditMode() ? 'Update Expense' : 'Add Expense');

    categories = [
        { value: 'food', label: '🍔 Food & Dining' },
        { value: 'transport', label: '🚗 Transportation' },
        { value: 'entertainment', label: '🎬 Entertainment' },
        { value: 'utilities', label: '💡 Utilities' },
        { value: 'shopping', label: '🛍️ Shopping' },
        { value: 'health', label: '🏥 Healthcare' },
        { value: 'other', label: '📦 Other' }
    ];

    // Lifecycle - watch for expense to edit
    constructor() {
        // When expense to edit changes, populate form
        const expenseToEdit = this.expenseToEdit();
        if (expenseToEdit) {
            this.expenseForm.patchValue({
                description: expenseToEdit.title,
                amount: expenseToEdit.amount,
                currency: expenseToEdit.currency || 'INR',
                paidBy: expenseToEdit.paidBy,
                date: expenseToEdit.date instanceof Date
                    ? expenseToEdit.date.toISOString().split('T')[0]
                    : expenseToEdit.date,
                category: '' // ExpenseCardData doesn't have category, so leave empty
            });
        }
    }

    onClose() {
        this.expenseForm.reset({
            currency: 'INR',
            date: new Date().toISOString().split('T')[0]
        });
        this.close.emit();
    }

    onSubmit() {
        if (this.expenseForm.invalid) return;

        this.isSubmitting.set(true);

        const formData: ExpenseFormData = {
            description: this.expenseForm.value.description,
            amount: this.expenseForm.value.amount,
            currency: this.expenseForm.value.currency,
            paidBy: this.expenseForm.value.paidBy,
            date: this.expenseForm.value.date,
            category: this.expenseForm.value.category
        };

        this.save.emit(formData);

        // Reset form after save
        this.expenseForm.reset({
            currency: 'INR',
            date: new Date().toISOString().split('T')[0]
        });
        this.isSubmitting.set(false);
    }
}
