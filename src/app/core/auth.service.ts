import { Injectable, signal } from '@angular/core';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase.client';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly session = signal<Session | null>(null);
  readonly loading = signal(true);

  constructor() {
    supabase.auth.getSession().then(({ data }) => {
      this.session.set(data.session);
      this.loading.set(false);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      this.session.set(session);
    });
  }

  signUp(email: string, password: string, fullName: string) {
    return supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
  }

  signIn(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password });
  }

  signOut() {
    return supabase.auth.signOut();
  }

  resetPasswordForEmail(email: string) {
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
  }

  updatePassword(password: string) {
    return supabase.auth.updateUser({ password });
  }
}
