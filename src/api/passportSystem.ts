import { supabase } from '../lib/supabase'

export interface Passport {
  id: string
  passport_number: number
  holder_name: string
  holder_contact: string
  contact_type: 'line' | 'ig'
  status: 'active' | 'suspended'
  invite_slots_total: number
  invite_slots_used: number
  pudding_claimed: boolean
  issued_at: string
  notes: string | null
  user_id: string | null
}

// ── Public Passport（只含公開欄位，不含 contact / user_id）──
export interface PassportPublic {
  id: string
  passport_number: number
  holder_name: string
  status: 'active' | 'suspended'
  invite_slots_total: number
  invite_slots_used: number
  pudding_claimed: boolean
}

interface RpcResult {
  ok: boolean
  error?: string
  data?: PassportPublic
  invitation_id?: string
  passport_number?: number
  holder_name?: string
}

// ── RPC: get_passport_public ──
export async function getPassportPublic(id: string): Promise<{ data: PassportPublic | null; error: Error | null }> {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') }
  const { data, error } = await supabase.rpc('get_passport_public', { p_id: id })
  if (error) return { data: null, error: error as Error }
  const result = data as RpcResult
  if (!result.ok) return { data: null, error: new Error(result.error ?? 'Unknown error') }
  return { data: result.data ?? null, error: null }
}

// ── RPC: create_invitation_public ──
export async function createInvitationPublic(params: {
  passport_id: string
  contact: string
  contact_type: 'line' | 'ig'
}): Promise<{ data: { invitation_id: string } | null; error: Error | null }> {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') }
  const { data, error } = await supabase.rpc('create_invitation_public', {
    p_passport_id: params.passport_id,
    p_contact: params.contact,
    p_contact_type: params.contact_type,
  })
  if (error) return { data: null, error: error as Error }
  const result = data as RpcResult
  if (!result.ok) return { data: null, error: new Error(result.error ?? 'Unknown error') }
  return { data: { invitation_id: result.invitation_id! }, error: null }
}

// ── RPC: redeem_pudding_staff ──
export async function redeemPuddingStaff(params: {
  passport_number: number
  staff_password: string
}): Promise<{ data: { passport_number: number; holder_name: string } | null; error: Error | null }> {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') }
  const { data, error } = await supabase.rpc('redeem_pudding_staff', {
    p_passport_number: params.passport_number,
    p_staff_password: params.staff_password,
  })
  if (error) return { data: null, error: error as Error }
  const result = data as RpcResult
  if (!result.ok) return { data: null, error: new Error(result.error ?? 'Unknown error') }
  return {
    data: { passport_number: result.passport_number!, holder_name: result.holder_name! },
    error: null,
  }
}
