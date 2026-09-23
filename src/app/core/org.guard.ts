import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { supabase } from './supabase.client';

// Signed-in users without an organization yet must finish onboarding first.
export const orgGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return router.createUrlTree(['/login']);
  const { data } = await supabase.from('profiles').select('organization_id').eq('id', userId).maybeSingle();
  return data?.organization_id ? true : router.createUrlTree(['/onboarding']);
};
