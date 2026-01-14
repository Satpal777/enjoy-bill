import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Supabase } from '../../core/services/supabase';
import { ActivatedRoute, Router, RouterLink, RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Login implements OnInit {
  private fb = inject(FormBuilder);
  private supabaseService = inject(Supabase);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

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

  ngOnInit() {
    const returnUrl = this.route.snapshot.queryParams['returnUrl'];
    console.log(returnUrl);
    if (returnUrl && returnUrl.includes('#')) {
      console.log('returnUrl', returnUrl);
      const fragmentFromReturnUrl = returnUrl.split('#')[1];
      console.log('fragmentFromReturnUrl', fragmentFromReturnUrl);
      this.checkErrorParams(new URLSearchParams(fragmentFromReturnUrl));
    }
  }

  private checkErrorParams(params: URLSearchParams) {
    const errorDescription = params.get('error_description');
    if (errorDescription) {
      this.errorMessage.set(errorDescription.replace(/\+/g, ' '));
    }
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
      const returnUrl = this.route.snapshot.queryParams['returnUrl'];
      if (returnUrl && returnUrl.includes('invite')) {
        this.router.navigateByUrl(returnUrl);
      } else {
        this.router.navigate(['/dashboard']);
      }
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
