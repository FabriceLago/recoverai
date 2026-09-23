import { Injectable, effect, inject, signal } from '@angular/core';
import { supabase } from './supabase.client';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  private readonly auth = inject(AuthService);
  readonly organizationId = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (!this.auth.session()) {
        this.organizationId.set(null);
        return;
      }
      void this.refresh();
    });
  }

  async refresh(): Promise<void> {
    const userId = this.auth.session()?.user.id;
    if (!userId) return;
    const { data } = await supabase.from('profiles').select('organization_id').eq('id', userId).maybeSingle();
    this.organizationId.set(data?.['organization_id'] ?? null);
  }
}
