import 'server-only';
import { supabaseServer } from './supabase';
import { Registration, Event } from './types';

export interface GetRegistrationsParams {
  page?: number;
  limit?: number;
  search?: string;
  event_id?: string;
  status?: string;
  payment_status?: string;
}

export async function getRegistrations(params: GetRegistrationsParams) {
  const page = params.page || 1;
  const limit = params.limit || 20;
  const offset = (page - 1) * limit;

  let participantIds: string[] = [];

  // If there's a search term, find matching participants first to handle cross-table OR logic
  if (params.search) {
    const { data: pData } = await supabaseServer
      .from('participants')
      .select('id')
      .ilike('full_name', `%${params.search}%`);
    
    if (pData && pData.length > 0) {
      participantIds = pData.map(p => p.id);
    }
  }

  // Determine the inner joins for filtering
  // If payment_status is provided, we need to filter on transactions
  let selectQuery = '*, events(*), participants(*)';
  if (params.payment_status && params.payment_status !== 'ALL') {
    selectQuery += `, transactions!inner(*)`;
  } else {
    selectQuery += `, transactions(*)`;
  }

  let query = supabaseServer
    .from('registrations')
    .select(selectQuery, { count: 'exact' });

  // Apply Search
  if (params.search) {
    if (participantIds.length > 0) {
      // Supabase OR syntax for arrays requires formatting: or(col.eq.val,col2.in.(val1,val2))
      query = query.or(`registration_code.ilike.%${params.search}%,participant_id.in.(${participantIds.join(',')})`);
    } else {
      query = query.ilike('registration_code', `%${params.search}%`);
    }
  }

  // Apply Event Filter
  if (params.event_id && params.event_id !== 'ALL') {
    query = query.eq('event_id', params.event_id);
  }

  // Apply Registration Status Filter
  if (params.status && params.status !== 'ALL') {
    query = query.eq('status', params.status);
  }

  // Apply Payment Status Filter (requires transactions!inner)
  if (params.payment_status && params.payment_status !== 'ALL') {
    query = query.eq('transactions.status', params.payment_status);
  }

  // Apply Pagination
  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    // suppress console.error in dev to prevent Next.js overlay for missing tables
    // console.warn('Supabase getRegistrations error:', error.message);
    return {
      data: [],
      count: 0,
      totalPages: 0,
    };
  }

  return {
    data: (data || []).map((item: any) => ({
      ...item,
      participants: Array.isArray(item.participants) ? item.participants[0] : item.participants,
      transactions: Array.isArray(item.transactions) ? item.transactions[0] : item.transactions
    })) as unknown as Registration[],
    count: count || 0,
    totalPages: count ? Math.ceil(count / limit) : 0,
  };
}

export async function getRegistrationById(id: string) {
  const { data, error } = await supabaseServer
    .from('registrations')
    .select('*, events(*), participants(*), transactions(*)')
    .eq('id', id)
    .single();

  if (error) {
    // console.warn('Supabase getRegistrationById error:', error.message);
    return null;
  }

  const formattedData = {
    ...data,
    participants: Array.isArray(data.participants) ? data.participants[0] : data.participants,
    transactions: Array.isArray(data.transactions) ? data.transactions[0] : data.transactions
  };

  return formattedData as unknown as Registration;
}

export async function getEvents() {
  const { data, error } = await supabaseServer
    .from('events')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    // console.warn('Supabase getEvents error:', error.message);
    return [];
  }

  return data as unknown as Event[];
}
