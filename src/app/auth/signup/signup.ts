import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Supabase } from '../../core/services/supabase';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-signup',
  imports: [FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './signup.html',
  styleUrl: './signup.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Signup {
  private fb = inject(FormBuilder);
  private supabaseService = inject(Supabase);
  private router = inject(Router);

  signupForm: FormGroup = this.fb.group({
    displayName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: this.passwordMatchValidator });

  loading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  async onSubmit() {
    if (this.signupForm.invalid) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      const { email, password, displayName } = this.signupForm.value;
      await this.supabaseService.signUp(email, password, displayName);

      this.successMessage.set('Account created successfully! Please check your email to verify your account.');

      // Redirect to login after 2 seconds
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 2000);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create account. Please try again.';
      this.errorMessage.set(message);
    } finally {
      this.loading.set(false);
    }
  }

  get displayName() {
    return this.signupForm.get('displayName');
  }

  get email() {
    return this.signupForm.get('email');
  }

  get password() {
    return this.signupForm.get('password');
  }

  get confirmPassword() {
    return this.signupForm.get('confirmPassword');
  }
}
