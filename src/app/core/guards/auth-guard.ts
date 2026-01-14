import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Supabase } from '../services/supabase';
import { AuthLoadingService } from '../services/auth-loading.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const supabaseService = inject(Supabase);
  const router = inject(Router);
  const authLoadingService = inject(AuthLoadingService);

  authLoadingService.startLoading();

  try {
    const { data: { user } } = await supabaseService.getUser();

    if (!user) {
      router.navigate(['login'], { queryParams: { returnUrl: state.url } });
      return false;
    }

    return true;
  } finally {
    authLoadingService.stopLoading();
  }
};
