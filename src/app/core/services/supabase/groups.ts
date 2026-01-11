import { Injectable } from '@angular/core';
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

  private client: SupabaseClient;

  constructor(private supabaseSerice: Supabase) {
    this.client = this.supabaseSerice.getSupabaseClient();
  }

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
    const { data: { user } } = await this.client.auth.getUser();
    if (!user) return [];

    const { data, error } = await this.client
      .from('groups')
      .select(`
      *,
      my_membership:group_members!inner(user_id),
      group_members(count),
      expenses(count)
    `)
      .eq('my_membership.user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error loading groups:', error);
      return [];
    }

    // Map the response to your interface
    return (data || []).map((g: any) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      created_at: g.created_at,
      // Safely access counts from the arrays
      member_count: g.group_members?.[0]?.count || 0,
      expense_count: g.expenses?.[0]?.count || 0
    }));
  }

  async createGroup(name: string, description: string = '') {
    const user = await this.client.auth.getUser();
    const userId = user.data.user?.id;

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

    const user = await this.client.auth.getUser();
    const userId = user.data.user?.id;

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
    const { data: { user } } = await this.client.auth.getUser();

    if (!user) {
      throw new Error('You must be logged in to invite members.');
    }

    const { data, error } = await this.client
      .from('group_invitations')
      .insert({
        group_id: groupId,
        invitee_email: email,
        inviter_id: user.id,
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
    const { data: { user } } = await this.client.auth.getUser();
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
    return (data || []).map((invite: any) => ({
      id: invite.id,
      created_at: invite.created_at,
      expires_at: invite.expires_at,
      group_name: invite.group?.name || 'Unknown',
      inviter_name: invite.inviter?.display_name || 'Someone'
    }));
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
    const updateChannel = new BehaviorSubject({});
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
        (payload) => {
          updateChannel.next(payload);
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
