import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Supabase } from '../services/supabase';
import { map } from 'rxjs';

export const authGuard: CanActivateFn = async (route, state) => {
  const supabaseService = inject(Supabase);
  const router = inject(Router);
  const { data: { user } } = await supabaseService.getUser();
  if (!user) {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }
  return true;
};
