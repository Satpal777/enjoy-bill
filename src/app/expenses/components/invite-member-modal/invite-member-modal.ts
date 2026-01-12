import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Modal } from '../../../shared/components/modal/modal';
import { DatePipe } from '@angular/common';
import { PendingInvitations } from '../../../shared/components/models/modet.types';

@Component({
    selector: 'app-invite-member-modal',
    imports: [Modal, ReactiveFormsModule, DatePipe],
    templateUrl: './invite-member-modal.html',
    styleUrl: './invite-member-modal.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class InviteMemberModal {
    private fb = inject(FormBuilder);

    // Inputs
    isOpen = input<boolean>(false);
    groupId = input<string>('');
    pendingInvites = input<PendingInvitations[]>([]);

    // Outputs
    close = output<void>();
    invite = output<string>(); // email

    // State
    isInviting = signal(false);
    inviteError = signal<string | null>(null);
    inviteSuccess = signal(false);
    invitedEmail = signal('');
    linkCopied = signal(false);
    inviteLink = signal('');

    // Form
    inviteForm: FormGroup = this.fb.group({
        email: ['', [Validators.required, Validators.email]]
    });

    // Computed
    hasPendingInvites = computed(() => this.pendingInvites().length > 0);

    onClose() {
        this.inviteForm.reset();
        this.inviteError.set(null);
        this.inviteSuccess.set(false);
        this.linkCopied.set(false);
        this.close.emit();
    }

    async onInvite() {
        if (this.inviteForm.invalid) return;

        this.isInviting.set(true);
        this.inviteError.set(null);

        const email = this.inviteForm.value.email;
        this.invitedEmail.set(email);

        // Emit the email to parent component
        this.invite.emit(email);

        // Show success state
        this.inviteSuccess.set(true);
        this.inviteForm.reset();
        this.isInviting.set(false);
    }

    generateInviteLink() {
        // This would typically call a service to generate a unique link
        const baseUrl = window.location.origin;
        const groupId = this.groupId();
        const link = `${baseUrl}/invite/${groupId}`;
        this.inviteLink.set(link);
        return link;
    }

    async copyInviteLink() {
        const link = this.generateInviteLink();

        try {
            await navigator.clipboard.writeText(link);
            this.linkCopied.set(true);

            // Reset after 3 seconds
            setTimeout(() => {
                this.linkCopied.set(false);
            }, 3000);
        } catch (error) {
            console.error('Failed to copy link:', error);
            this.inviteError.set('Failed to copy link to clipboard');
        }
    }

    setInviteError(error: string) {
        this.inviteError.set(error);
        this.isInviting.set(false);
    }

    setInviteSuccess(success: boolean) {
        this.inviteSuccess.set(success);
    }
}
