import { Injectable, NgZone, inject, signal } from '@angular/core';
import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly supabase: SupabaseClient;
  private readonly ngZone = inject(NgZone);

  readonly token = signal<string | null>(null);
  readonly userId = signal<string | null>(null);
  readonly initialized = signal<boolean>(false);

  get client(): SupabaseClient {
    return this.supabase;
  }

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);

    this.supabase.auth.getSession().then(({ data: { session } }) => {
      this.updateSession(session);
      this.initialized.set(true);
    });

    this.supabase.auth.onAuthStateChange((event, session) => {
      this.ngZone.run(() => {
        this.updateSession(session);
        this.initialized.set(true);
      });
    });
  }

  private updateSession(session: Session | null): void {
    if (session) {
      this.token.set(session.access_token);
      this.userId.set(session.user.id);
    } else {
      this.token.set(null);
      this.userId.set(null);
    }
  }

  async signIn(email: string, password: string): Promise<any> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) {
      throw error;
    }
    return data;
  }

  async signOut(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();
    if (error) {
      throw error;
    }
  }
}
