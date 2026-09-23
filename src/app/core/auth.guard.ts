import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { supabase } from './supabase.client';

export const authGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const { data } = await supabase.auth.getSession();
  return data.session ? true : router.createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const { data } = await supabase.auth.getSession();
  return data.session ? router.createUrlTree(['/dashboard']) : true;
};
