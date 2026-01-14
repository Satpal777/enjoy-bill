import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Supabase {
  private supabase: SupabaseClient;
  private currentUser = new BehaviorSubject<User | null>(null);
  public currentUser$: Observable<User | null> = this.currentUser.asObservable();

  constructor() {
    this.supabase = createClient(
      import.meta.env['NG_APP_SUPABASE_URL'],
      import.meta.env['NG_APP_SUPABASE_KEY']
    );

    // Listen to auth state changes
    this.supabase.auth.onAuthStateChange((event, session) => {
      this.currentUser.next(session?.user ?? null);
    });

    // Initialize current user
    this.loadUser();
  }


  async getUser() {
    return await this.supabase.auth.getUser();
  }

  private async loadUser() {
    const { data: { user } } = await this.getUser();
    this.currentUser.next(user);
  }


  // Auth methods
  async signUp(email: string, password: string, displayName?: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: import.meta.env['NG_APP_BASE_DASHBOARD_URL'],
        data: {
          display_name: displayName || email.split('@')[0]
        },
      }
    });

    if (error) throw error;
    return data;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }

  async resetPassword(email: string) {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  }

  // Profile methods
  async getProfile(userId: string) {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  async updateProfile(userId: string, updates: any) {
    const { data, error } = await this.supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Utility methods
  getCurrentUser(): User | null {
    return this.currentUser.value;
  }

  getCurrentUserId(): string | null {
    return this.currentUser.value?.id ?? null;
  }

  isAuthenticated(): boolean {
    return this.currentUser.value !== null;
  }

  getSupabaseClient(): SupabaseClient {
    return this.supabase;
  }
}
