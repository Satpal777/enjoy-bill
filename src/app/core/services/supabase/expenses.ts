import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { Supabase } from '../supabase';
import { ExpenseDbPayload, ExpenseDetail } from '../../../shared/components/models/modet.types';

@Injectable({
  providedIn: 'root',
})
export class Expenses {

  private client: SupabaseClient;

  constructor(private supabaseSerice: Supabase) {
    this.client = this.supabaseSerice.getSupabaseClient();
  }

  async createExpense(dbPayload: ExpenseDbPayload) {
    const user = await this.client.auth.getUser();
    const userId = user.data.user?.id;

    if (!userId) throw new Error('Not authenticated');


    const { data: groupData, error: groupError } = await this.client
      .from('expenses')
      .insert(dbPayload)
      .select()
      .single();

    if (groupError) throw groupError;

    return groupData;
  }

  async getExpenseDetails(id: string) {
    const { data, error } = await this.client
      .from('expenses')
      .select(`
      *,
      group:groups ( id, name ),
      paid_by_user:profiles!paid_by ( id, display_name ),
      splits:expense_splits (
        amount_owed,
        user:profiles ( id, display_name )
      )
    `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as ExpenseDetail;
  }

  async deleteExpense(id: string) {
    const { data, error } = await this.client
      .from('expenses')
      .delete()
      .eq('id', id);
  }

  async updateExpense(id: string, payload: any) {
    const { data, error } = await this.client
      .from('expenses')
      .update(payload)
      .eq('id', id);
  }
}
