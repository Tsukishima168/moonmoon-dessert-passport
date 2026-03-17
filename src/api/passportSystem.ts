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

export async function getPassportById(id: string): Promise<{ data: Passport | null; error: Error | null }> {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') }
  const { data, error } = await supabase
    .from('passports')
    .select('*')
    .eq('id', id)
    .single()
  return { data: data as Passport | null, error: error as Error | null }
}

export async function getPassportByNumber(num: number): Promise<{ data: Passport | null; error: Error | null }> {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') }
  const { data, error } = await supabase
    .from('passports')
    .select('*')
    .eq('passport_number', num)
    .single()
  return { data: data as Passport | null, error: error as Error | null }
}

export async function createInvitation(params: {
  from_passport_id: string
  invitee_contact: string
  invitee_contact_type: 'line' | 'ig'
}): Promise<{ data: unknown; error: Error | null }> {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') }
  const { data, error } = await supabase
    .from('invitations')
    .insert({
      from_passport_id: params.from_passport_id,
      invitee_contact: params.invitee_contact,
      invitee_contact_type: params.invitee_contact_type,
      status: 'approved',
      auto_approved_reason: 'trusted_referral',
      approved_at: new Date().toISOString(),
    })
    .select()
    .single()
  return { data, error: error as Error | null }
}

export async function redeemPudding(params: {
  passport_id: string
  verified_by: string
}): Promise<{ data: unknown; error: Error | null }> {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') }

  // 1. INSERT redemption record
  const { error: insertError } = await supabase
    .from('redemptions')
    .insert({
      passport_id: params.passport_id,
      reward_type: 'pudding',
      verified_by: params.verified_by,
      source: 'passport',
    })

  if (insertError) return { data: null, error: insertError as Error }

  // 2. UPDATE passport pudding_claimed = true
  const { data, error: updateError } = await supabase
    .from('passports')
    .update({ pudding_claimed: true })
    .eq('id', params.passport_id)
    .select()
    .single()

  return { data, error: updateError as Error | null }
}
