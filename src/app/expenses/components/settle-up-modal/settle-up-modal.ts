import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Modal } from '../../../shared/components/modal/modal';
import { CurrencyPipe } from '@angular/common';
import { Supabase } from '../../../core/services/supabase';

interface Member {
    id: string;
    name: string;
    avatar?: string;
}

interface Balance {
    user_id: string;
    balance: number;
}

export interface SettlementData {
    groupId: string;
    payerId: string;
    payeeId: string;
    amount: number;
    currency: string;
    notes?: string;
    proofImageUrl?: string;
}

interface SettlementSuggestion {
    from: Member;
    to: Member;
    amount: number;
    reason: string;
}

@Component({
    selector: 'app-settle-up-modal',
    imports: [Modal, ReactiveFormsModule, CurrencyPipe],
    templateUrl: './settle-up-modal.html',
    styleUrl: './settle-up-modal.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettleUpModal {
    private fb = inject(FormBuilder);

    // Inputs
    isOpen = input<boolean>(false);
    groupId = input<string>('');
    members = input<Member[]>([]);
    balances = input<Balance[]>([]);
    currentUserId = input<string>('');

    // Outputs
    close = output<void>();
    settle = output<SettlementData>();

    // State
    isSubmitting = signal(false);
    showManualForm = signal(false);
    selectedImage = signal<File | null>(null);
    imagePreview = signal<string | null>(null);
    uploadingImage = signal(false);

    // Services
    private supabaseService = inject(Supabase);

    // Form
    settlementForm: FormGroup = this.fb.group({
        payeeId: [null, Validators.required],
        amount: [null, [Validators.required, Validators.min(0.01)]],
        notes: ['']
    });

    // Computed
    currentUserBalance = computed(() => {
        // SQL function returns balances relative to current user
        // Current user's balance = sum of all other members' balances
        // Example: If tester has balance -50, that means you owe them 50, so your balance is -50
        return this.balances()
            .filter(b => b.user_id !== this.currentUserId())
            .reduce((sum, b) => sum + b.balance, 0);
    });

    suggestions = computed(() => this.calculateSettlementSuggestions());

    myDebts = computed(() => {
        // SQL returns balances relative to current user:
        // Negative balance = current user owes that member
        return this.balances()
            .filter(b => b.user_id !== this.currentUserId() && b.balance < 0)
            .map(b => {
                const member = this.members().find(m => m.id === b.user_id);
                return {
                    member: member!,
                    amount: Math.abs(b.balance)
                };
            })
            .filter(d => d.amount > 0);
    });

    myCredits = computed(() => {
        // SQL returns balances relative to current user:
        // Positive balance = that member owes current user
        return this.balances()
            .filter(b => b.user_id !== this.currentUserId() && b.balance > 0)
            .map(b => {
                const member = this.members().find(m => m.id === b.user_id);
                return {
                    member: member!,
                    amount: b.balance
                };
            })
            .filter(c => c.amount > 0);
    });

    eligiblePayees = computed(() => {
        // Can only pay to people you owe (negative balance = you owe them)
        return this.balances()
            .filter(b => b.user_id !== this.currentUserId() && b.balance < 0)
            .map(b => this.members().find(m => m.id === b.user_id)!)
            .filter(m => m !== undefined);
    });

    calculateSettlementSuggestions(): SettlementSuggestion[] {
        const currentUserId = this.currentUserId();
        const userBalance = this.currentUserBalance();

        if (userBalance === 0) return [];

        const suggestions: SettlementSuggestion[] = [];

        if (userBalance < 0) {
            // User owes money - suggest paying the person they owe most to
            const debts = this.myDebts();
            if (debts.length > 0) {
                const largestDebt = debts.reduce((max, debt) =>
                    debt.amount > max.amount ? debt : max
                );

                suggestions.push({
                    from: this.members().find(m => m.id === currentUserId)!,
                    to: largestDebt.member,
                    amount: largestDebt.amount,
                    reason: `Settle your balance with ${largestDebt.member.name}`
                });
            }
        } else {
            // User is owed money - suggest who should pay them
            const credits = this.myCredits();
            if (credits.length > 0) {
                const largestCredit = credits.reduce((max, credit) =>
                    credit.amount > max.amount ? credit : max
                );

                suggestions.push({
                    from: largestCredit.member,
                    to: this.members().find(m => m.id === currentUserId)!,
                    amount: largestCredit.amount,
                    reason: `${largestCredit.member.name} should pay you`
                });
            }
        }

        return suggestions;
    }

    onClose() {
        this.settlementForm.reset();
        this.showManualForm.set(false);
        this.close.emit();
    }

    acceptSuggestion(suggestion: SettlementSuggestion) {
        const settlement: SettlementData = {
            groupId: this.groupId(),
            payerId: suggestion.from.id,
            payeeId: suggestion.to.id,
            amount: suggestion.amount,
            currency: 'INR',
            notes: suggestion.reason
        };

        this.settle.emit(settlement);
        this.onClose();
    }

    async onSubmitManual() {
        if (this.settlementForm.invalid) return;

        this.isSubmitting.set(true);

        let proofImageUrl: string | null = null;

        // Upload image if selected
        if (this.selectedImage()) {
            this.uploadingImage.set(true);
            proofImageUrl = await this.uploadProofImage(this.selectedImage()!);
            this.uploadingImage.set(false);
        }

        const settlement: SettlementData = {
            groupId: this.groupId(),
            payerId: this.currentUserId(),
            payeeId: this.settlementForm.value.payeeId,
            amount: this.settlementForm.value.amount,
            currency: 'INR',
            notes: this.settlementForm.value.notes || undefined,
            proofImageUrl: proofImageUrl || undefined
        };

        this.settle.emit(settlement);
        this.settlementForm.reset();
        this.selectedImage.set(null);
        this.imagePreview.set(null);
        this.isSubmitting.set(false);
        this.showManualForm.set(false);
    }

    onImageSelect(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            const file = input.files[0];
            this.selectedImage.set(file);

            // Create preview
            const reader = new FileReader();
            reader.onload = (e) => {
                this.imagePreview.set(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    }

    removeImage() {
        this.selectedImage.set(null);
        this.imagePreview.set(null);
    }

    async uploadProofImage(file: File): Promise<string | null> {
        try {
            const fileName = `${Date.now()}_${file.name}`;
            const { data, error } = await this.supabaseService.getSupabaseClient()
                .storage
                .from('settlement-proofs')
                .upload(fileName, file);

            if (error) throw error;

            // Get public URL
            const { data: { publicUrl } } = this.supabaseService.getSupabaseClient()
                .storage
                .from('settlement-proofs')
                .getPublicUrl(data.path);

            return publicUrl;
        } catch (error) {
            console.error('Error uploading image:', error);
            return null;
        }
    }

    toggleManualForm() {
        this.showManualForm.set(!this.showManualForm());
    }
}
