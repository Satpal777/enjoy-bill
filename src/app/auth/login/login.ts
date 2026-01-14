import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Supabase } from '../../core/services/supabase';
import { Router, RouterLink, RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Login {
  private fb = inject(FormBuilder);
  private supabaseService = inject(Supabase);
  private router = inject(Router);

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  loading = signal(false);
  errorMessage = signal('');
  isReturningUser = signal(false);

  constructor() {
    // Check if user has logged in before
    const hasLoggedInBefore = localStorage.getItem('hasLoggedIn');
    this.isReturningUser.set(hasLoggedInBefore === 'true');
  }

  async onSubmit() {
    if (this.loginForm.invalid) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const { email, password } = this.loginForm.value;
      await this.supabaseService.signIn(email, password);

      // Mark user as having logged in before
      localStorage.setItem('hasLoggedIn', 'true');

      this.router.navigate(['/dashboard']);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to sign in. Please try again.';
      this.errorMessage.set(message);
    } finally {
      this.loading.set(false);
    }
  }

  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }
}
