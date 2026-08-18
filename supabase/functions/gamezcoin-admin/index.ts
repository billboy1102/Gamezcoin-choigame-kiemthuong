import { createClient } from 'npm:@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } })

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405)
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const authHeader = req.headers.get('Authorization') || ''
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } })
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: userData, error: userError } = await userClient.auth.getUser()
  const user = userData.user
  if (userError || !user) return json({ error: 'UNAUTHORIZED' }, 401)
  const { data: adminRow, error: adminError } = await admin.from('gamezcoin_admins').select('user_id').eq('user_id', user.id).maybeSingle()
  if (adminError) return json({ error: 'ADMIN_CHECK_FAILED' }, 500)
  if (!adminRow) return json({ error: 'FORBIDDEN' }, 403)
  let body: any = {}
  try { body = await req.json() } catch { return json({ error: 'INVALID_JSON' }, 400) }
  const action = String(body?.action || '')

  try {
    if (action === 'overview') {
      const [profilesQ, walletsQ, pendingQ] = await Promise.all([
        admin.from('gamezcoin_profiles').select('user_id', { count: 'exact' }),
        admin.from('gamezcoin_wallets').select('balance,lifetime_earned,lifetime_withdrawn'),
        admin.from('gamezcoin_withdrawals').select('coin_amount').eq('status', 'pending'),
      ])
      const firstError = [profilesQ, walletsQ, pendingQ].find((q: any) => q.error)?.error
      if (firstError) throw firstError
      const wallets = walletsQ.data || []; const pending = pendingQ.data || []
      return json({
        users: profilesQ.count || 0,
        circulating_coin: wallets.reduce((s: number, x: any) => s + Number(x.balance || 0), 0),
        lifetime_earned: wallets.reduce((s: number, x: any) => s + Number(x.lifetime_earned || 0), 0),
        lifetime_withdrawn: wallets.reduce((s: number, x: any) => s + Number(x.lifetime_withdrawn || 0), 0),
        pending_withdrawals: pending.length,
        pending_coin: pending.reduce((s: number, x: any) => s + Number(x.coin_amount || 0), 0),
      })
    }

    if (action === 'users') {
      const page = Math.max(1, Math.floor(Number(body?.page || 1)))
      const perPage = Math.min(100, Math.max(1, Math.floor(Number(body?.per_page || 50))))
      const { data: authData, error: authError } = await admin.auth.admin.listUsers({ page, perPage })
      if (authError) throw authError
      const users = authData.users || []; const ids = users.map((u: any) => u.id)
      const [profilesQ, walletsQ] = ids.length ? await Promise.all([
        admin.from('gamezcoin_profiles').select('*').in('user_id', ids),
        admin.from('gamezcoin_wallets').select('*').in('user_id', ids),
      ]) : [{ data: [] }, { data: [] }] as any
      const profiles = new Map((profilesQ.data || []).map((x: any) => [x.user_id, x]))
      const wallets = new Map((walletsQ.data || []).map((x: any) => [x.user_id, x]))
      return json({ users: users.map((u: any) => ({ id: u.id, email: u.email, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at, profile: profiles.get(u.id) || null, wallet: wallets.get(u.id) || null })) })
    }

    if (action === 'withdrawals') {
      const status = String(body?.status || 'all')
      let q = admin.from('gamezcoin_withdrawals').select('*').order('created_at', { ascending: false }).limit(200)
      if (['pending', 'paid', 'rejected'].includes(status)) q = q.eq('status', status)
      const { data: withdrawals, error } = await q
      if (error) throw error
      const ids = [...new Set((withdrawals || []).map((w: any) => w.user_id))]
      const { data: profiles, error: pError } = ids.length ? await admin.from('gamezcoin_profiles').select('user_id,display_name,referral_code').in('user_id', ids) : { data: [], error: null } as any
      if (pError) throw pError
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]))
      return json({ withdrawals: (withdrawals || []).map((w: any) => ({ ...w, profile: profileMap.get(w.user_id) || null })) })
    }

    if (action === 'process_withdrawal') {
      const withdrawalId = String(body?.withdrawal_id || ''); const decision = String(body?.decision || '')
      const note = String(body?.note || '').trim().slice(0, 500)
      if (!withdrawalId || !['approve', 'reject'].includes(decision)) return json({ error: 'INVALID_REQUEST' }, 400)
      const { data, error } = await admin.rpc('gamezcoin_process_withdrawal', { p_admin_id: user.id, p_withdrawal_id: withdrawalId, p_action: decision, p_note: note || null })
      if (error) return json({ error: error.message || 'PROCESS_FAILED' }, 400)
      return json({ result: data })
    }

    if (action === 'adjust_coin') {
      const targetUserId = String(body?.user_id || ''); const amount = Number(body?.amount); const note = String(body?.note || '').trim().slice(0, 300)
      if (!targetUserId || !Number.isSafeInteger(amount) || amount === 0 || note.length < 2) return json({ error: 'INVALID_REQUEST' }, 400)
      const { data, error } = await admin.rpc('gamezcoin_admin_adjust_coin', { p_admin_id: user.id, p_user_id: targetUserId, p_amount: amount, p_note: note })
      if (error) return json({ error: error.message || 'ADJUST_FAILED' }, 400)
      return json({ result: data })
    }

    if (action === 'update_setting') {
      const key = String(body?.key || '')
      const allowed = new Set(['coin_vnd_rate','min_withdrawal_coin','daily_checkin_coin','referral_inviter_coin','referral_invitee_coin'])
      const value = Number(body?.value)
      if (!allowed.has(key) || !Number.isSafeInteger(value) || value < 0) return json({ error: 'INVALID_SETTING' }, 400)
      const { data, error } = await admin.from('gamezcoin_settings').update({ value, updated_at: new Date().toISOString() }).eq('key', key).select('*').single()
      if (error) throw error
      return json({ setting: data })
    }

    if (action === 'update_game') {
      const id = String(body?.game_id || ''); const patch: Record<string, any> = { updated_at: new Date().toISOString() }
      if (body?.coin_per_point !== undefined) patch.coin_per_point = Math.max(1, Math.floor(Number(body.coin_per_point)))
      if (body?.enabled !== undefined) patch.enabled = !!body.enabled
      if (body?.max_score_per_second !== undefined) patch.max_score_per_second = Math.max(0.1, Number(body.max_score_per_second))
      if (body?.burst_allowance !== undefined) patch.burst_allowance = Math.max(0, Math.floor(Number(body.burst_allowance)))
      const { data, error } = await admin.from('gamezcoin_games').update(patch).eq('id', id).select('*').single()
      if (error) throw error
      return json({ game: data })
    }

    return json({ error: 'UNKNOWN_ACTION' }, 400)
  } catch (error: any) {
    console.error('gamezcoin-admin', action, error)
    return json({ error: error?.message || 'SERVER_ERROR' }, 500)
  }
})
