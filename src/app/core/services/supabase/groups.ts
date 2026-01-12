import { inject, Injectable } from '@angular/core';
import { Supabase } from '../supabase';
import { SupabaseClient } from '@supabase/supabase-js';
import { BehaviorSubject } from 'rxjs';
import { Balance } from '../../../shared/components/models/modet.types';

export interface Group {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  created_at: string;
  updated_at?: string;

  member_count?: number;
  expense_count?: number;
}

@Injectable({
  providedIn: 'root',
})
export class Groups {
  private supabaseSerice = inject(Supabase);
  private client: SupabaseClient = this.supabaseSerice.getSupabaseClient();

  async getGlobalBalances() {
    const { data, error } = await this.client
      .rpc('get_global_balances');

    if (error) {
      console.error('Error fetching global balances:', error);
      return { you_owe: 0, owed_to_you: 0 };
    }

    return data as { you_owe: number; owed_to_you: number };
  }

  async getUserGroups(): Promise<Group[]> {
    const userId = this.supabaseSerice.getCurrentUserId();
    if (!userId) return [];

    const { data, error } = await this.client
      .from('groups')
      .select(`
      *,
      my_membership:group_members!inner(user_id),
      group_members(count),
      expenses(count)
    `)
      .eq('my_membership.user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error loading groups:', error);
      return [];
    }

    // Map the response to your interface
    return (data || []).map((g: unknown) => {
      const group = g as Record<string, unknown>;
      return {
        id: group['id'] as string,
        name: group['name'] as string,
        description: group['description'] as string | undefined,
        created_at: group['created_at'] as string,
        // Safely access counts from the arrays
        member_count: (group['group_members'] as Array<{ count?: number }>)?.[0]?.count || 0,
        expense_count: (group['expenses'] as Array<{ count?: number }>)?.[0]?.count || 0
      };
    });
  }

  async createGroup(name: string, description: string = '') {
    const userId = this.supabaseSerice.getCurrentUserId();

    if (!userId) throw new Error('Not authenticated');


    const { data: groupData, error: groupError } = await this.client
      .from('groups')
      .insert({
        name,
        description,
        created_by: userId
      })
      .select()
      .single();

    if (groupError) throw groupError;

    return groupData;
  }

  async getGroupDetails(groupId: string) {

    const userId = this.supabaseSerice.getCurrentUserId();

    const groupPromise = this.client
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();

    const membersPromise = this.client
      .from('group_members')
      .select(`
      id,
      joined_at,
      profiles:user_id (
        id,
        display_name,
        avatar_url
      )
    `)
      .eq('group_id', groupId);


    const expensesPromise = this.client
      .from('expenses')
      .select(`
      *,
      payer:paid_by (
        id,
        display_name,
        avatar_url
      ),
      my_split:expense_splits (
        amount_owed
      )
    `)
      .eq('group_id', groupId)
      .eq('my_split.user_id', userId)
      .order('expense_date', { ascending: false });

    const invitesPromise = this.client
      .from('group_invitations')
      .select(`
        *,
        inviter:inviter_id (
          display_name,
          avatar_url
        )
      `)
      .eq('group_id', groupId)
      .eq('status', 'pending');

    const [groupData, members, expenses, invites] = await Promise.all([
      groupPromise,
      membersPromise,
      expensesPromise,
      invitesPromise
    ]);

    return {
      groupData: groupData.data,
      members: members.data,
      expenses: expenses.data,
      invites: invites.data,
      errors: {
        members: members.error,
        expenses: expenses.error,
        invites: invites.error
      }
    };
  }

  // groups.ts

  async getMemberBalances(groupId: string) {
    const { data, error } = await this.client
      .rpc('get_member_balances', { p_group_id: groupId });

    if (error) {
      console.error('Error fetching member balances:', error);
      return [];
    }
    return data as Balance[];
  }

  async inviteMember(groupId: string, email: string | null) {
    const user = this.supabaseSerice.getCurrentUser();
    const userId = this.supabaseSerice.getCurrentUserId();

    if (!user || !userId) {
      throw new Error('You must be logged in to invite members.');
    }

    const { data, error } = await this.client
      .from('group_invitations')
      .insert({
        group_id: groupId,
        invitee_email: email,
        inviter_id: userId,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase Invite Error:', error);
      if (error?.code === '23505') {
        throw new Error('This user has already been invited.');
      } else {
        throw new Error('Failed to invite user.');
      }
    }

    return data;
  }

  async getPendingInvitations() {
    const user = this.supabaseSerice.getCurrentUser();
    if (!user?.email) return [];

    const { data, error } = await this.client
      .from('group_invitations')
      .select(`
      id,
      created_at,
      expires_at,
      group:groups ( name ),
      inviter:profiles!inviter_id ( display_name )
    `)
      .eq('invitee_email', user.email)
      .eq('status', 'pending');

    if (error) {
      console.error('Error fetching invites:', error);
      return [];
    }
    return (data || []).map((invite: unknown) => {
      const inv = invite as Record<string, unknown>;
      return {
        id: inv['id'] as string,
        created_at: inv['created_at'] as string,
        expires_at: inv['expires_at'] as string,
        group_name: (inv['group'] as { name?: string })?.name || 'Unknown',
        inviter_name: (inv['inviter'] as { display_name?: string })?.display_name || 'Someone'
      };
    });
  }

  /**
   * Accept an invitation (Uses the RPC function we created)
   */
  async acceptInvitation(inviteId: string) {
    const { error } = await this.client
      .rpc('accept_invitation', { p_invite_id: inviteId });

    if (error) {
      console.error('Error accepting invite:', error);
      throw error;
    }
  }


  /**
   * Record a settlement payment between two members
   * Creates an expense with is_settlement = true
   */
  async recordSettlement(settlement: {
    groupId: string;
    payerId: string;
    payeeId: string;
    amount: number;
    currency: string;
    notes?: string;
    proofImageUrl?: string;
  }): Promise<void> {
    // Create the settlement expense
    const { data: expenseData, error: expenseError } = await this.client
      .from('expenses')
      .insert({
        group_id: settlement.groupId,
        paid_by: settlement.payerId,
        description: settlement.notes || 'Settlement payment',
        total_amount: settlement.amount,
        currency: settlement.currency,
        category: 'Settlement',
        is_settlement: true,
        expense_date: new Date().toISOString().split('T')[0],
        proof_image_url: settlement.proofImageUrl
      })
      .select('id')
      .single();

    if (expenseError) {
      console.error('Error recording settlement expense:', expenseError);
      throw expenseError;
    }

    // Create the expense split for the payee
    // This ensures the settlement reduces the balance correctly
    const { error: splitError } = await this.client
      .from('expense_splits')
      .insert({
        expense_id: expenseData.id,
        user_id: settlement.payeeId,
        amount_owed: settlement.amount
      });

    if (splitError) {
      console.error('Error creating settlement split:', splitError);
      throw splitError;
    }
  }

  async validateInvitation(inviteCode: string) {
    try {
      const { data, error } = await this.client
        .rpc('get_invite_details', { token_input: inviteCode });

      if (error) {
        throw error;
      }

      return {
        groupName: data.group_name,
        valid: data.valid,
        inviterName: data.inviter_name,
        message: data.message
      };
    }
    catch (error) {
      console.error('Error validating invite:', error);
      throw error;
    }
  }


  async acceptOneTimeInvitation(token: string) {
    const { data, error } = await this.client
      .rpc('accept_invite_by_token', { p_token: token })
      .select();

    if (error) {
      console.error('Error accepting invite:', error);
      throw error;
    }

    return data;
  }

  /**
   * Reject an invitation (Standard Update)
   */
  async rejectInvitation(inviteId: string) {
    const { error } = await this.client
      .from('group_invitations')
      .update({ status: 'declined' })
      .eq('id', inviteId)
      .select()
      .single();

    if (error) {
      console.error('Error rejecting invite:', error);
      throw error;
    }
  }

  subscribeToGroupChanges(groupId: string) {
    const updateChannel = new BehaviorSubject<boolean>(false);
    const channel = this.client
      .channel('group-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          updateChannel.next(true);
        }
      )
      .subscribe();

    return {
      unsubscribe: () => {
        this.client.removeChannel(channel);
        updateChannel.unsubscribe();
      },
      subscribe: () => updateChannel.asObservable()
    }
  }
}
