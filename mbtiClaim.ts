type ClaimResult =
  | { ok: true; mbtiType: string; variant: string }
  | { ok: false; reason: 'unconfigured' | 'invalid_or_used' | 'request_failed' };

const SUPABASE_URL =
  (import.meta.env.VITE_MOON_ISLAND_SUPABASE_URL ||
    import.meta.env.VITE_SUPABASE_URL) as string | undefined;
const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_MOON_ISLAND_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

export async function consumeMbtiClaim(code: string): Promise<ClaimResult> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { ok: false, reason: 'unconfigured' };
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/consume_mbti_claim`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ p_code: code })
    });

    if (!res.ok) {
      return { ok: false, reason: 'request_failed' };
    }

    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return { ok: true, mbtiType: data[0].mbti_type, variant: data[0].variant };
    }
    return { ok: false, reason: 'invalid_or_used' };
  } catch {
    return { ok: false, reason: 'request_failed' };
  }
}
