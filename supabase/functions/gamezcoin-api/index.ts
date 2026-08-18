import { createClient } from 'npm:@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
})

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const authHeader = req.headers.get('Authorization') || ''

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userError } = await userClient.auth.getUser()
  const user = userData.user
  if (userError || !user) return json({ error: 'UNAUTHORIZED' }, 401)

  let body: any = {}
  try { body = await req.json() } catch { return json({ error: 'INVALID_JSON' }, 400) }
  const action = String(body?.action || '')

  try {
    if (action === 'bootstrap' || action === 'dashboard') {
      const [profileQ, walletQ, gamesQ, settingsQ, adminQ, ledgerQ, withdrawalsQ, checkinsQ, referralsQ] = await Promise.all([
        admin.from('gamezcoin_profiles').select('*').eq('user_id', user.id).maybeSingle(),
        admin.from('gamezcoin_wallets').select('*').eq('user_id', user.id).maybeSingle(),
        admin.from('gamezcoin_games').select('*').eq('enabled', true).order('sort_order'),
        admin.from('gamezcoin_settings').select('key,value'),
        admin.from('gamezcoin_admins').select('user_id').eq('user_id', user.id).maybeSingle(),
        action === 'dashboard' ? admin.from('gamezcoin_wallet_ledger').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30) : Promise.resolve({ data: [] } as any),
        action === 'dashboard' ? admin.from('gamezcoin_withdrawals').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30) : Promise.resolve({ data: [] } as any),
        action === 'dashboard' ? admin.from('gamezcoin_checkins').select('*').eq('user_id', user.id).order('checkin_date', { ascending: false }).limit(30) : Promise.resolve({ data: [] } as any),
        action === 'dashboard' ? admin.from('gamezcoin_referrals').select('*').or(`inviter_id.eq.${user.id},invitee_id.eq.${user.id}`).order('created_at', { ascending: false }).limit(100) : Promise.resolve({ data: [] } as any),
      ])
      const firstError = [profileQ, walletQ, gamesQ, settingsQ, adminQ, ledgerQ, withdrawalsQ, checkinsQ, referralsQ].find((q: any) => q?.error)?.error
      if (firstError) throw firstError
      return json({
        user: { id: user.id, email: user.email }, profile: profileQ.data, wallet: walletQ.data,
        games: gamesQ.data || [], settings: Object.fromEntries((settingsQ.data || []).map((x: any) => [x.key, x.value])),
        is_admin: !!adminQ.data, ledger: ledgerQ.data || [], withdrawals: withdrawalsQ.data || [],
        checkins: checkinsQ.data || [], referrals: referralsQ.data || [],
      })
    }

    if (action === 'start_game') {
      const gameId = String(body?.game_id || '')
      const { data: game, error: gameError } = await admin.from('gamezcoin_games').select('*').eq('id', gameId).eq('enabled', true).maybeSingle()
      if (gameError) throw gameError
      if (!game) return json({ error: 'GAME_DISABLED' }, 400)
      const since = new Date(Date.now() - 20_000).toISOString()
      const { count, error: countError } = await admin.from('gamezcoin_game_sessions').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'active').gte('started_at', since)
      if (countError) throw countError
      if ((count || 0) >= 4) return json({ error: 'TOO_MANY_SESSIONS' }, 429)
      const { data: session, error } = await admin.from('gamezcoin_game_sessions').insert({ user_id: user.id, game_id: gameId }).select('id,game_id,nonce,started_at').single()
      if (error) throw error
      return json({ session, game })
    }

    if (action === 'finish_game') {
      const sessionId = String(body?.session_id || '')
      const score = Number(body?.score)
      if (!sessionId || !Number.isInteger(score) || score < 0 || score > 2_000_000_000) return json({ error: 'INVALID_SCORE' }, 400)
      const { data, error } = await admin.rpc('gamezcoin_award_game_session', { p_user_id: user.id, p_session_id: sessionId, p_score: score })
      if (error) return json({ error: error.message || 'REWARD_REJECTED' }, 400)
      if (data?.rejected) return json({ error: data.reason || 'REWARD_REJECTED' }, 400)
      return json({ result: data })
    }

    if (action === 'checkin') {
      const { data, error } = await admin.rpc('gamezcoin_claim_checkin', { p_user_id: user.id })
      if (error) throw error
      return json({ result: data })
    }

    if (action === 'withdraw') {
      const amount = Number(body?.coin_amount)
      const method = String(body?.method || '')
      const accountName = String(body?.account_name || '').trim().slice(0, 100)
      const accountNumber = String(body?.account_number || '').trim().slice(0, 100)
      const bankName = String(body?.bank_name || '').trim().slice(0, 100)
      if (!Number.isSafeInteger(amount) || amount <= 0) return json({ error: 'INVALID_AMOUNT' }, 400)
      const { data, error } = await admin.rpc('gamezcoin_create_withdrawal', {
        p_user_id: user.id, p_coin_amount: amount, p_method: method, p_account_name: accountName,
        p_account_number: accountNumber, p_bank_name: bankName || null,
      })
      if (error) return json({ error: error.message || 'WITHDRAW_FAILED' }, 400)
      return json({ result: data })
    }

    if (action === 'update_profile') {
      const displayName = String(body?.display_name || '').trim()
      if (displayName.length < 2 || displayName.length > 40) return json({ error: 'INVALID_DISPLAY_NAME' }, 400)
      const { data, error } = await admin.from('gamezcoin_profiles').update({ display_name: displayName, updated_at: new Date().toISOString() }).eq('user_id', user.id).select('*').single()
      if (error) throw error
      return json({ profile: data })
    }

    return json({ error: 'UNKNOWN_ACTION' }, 400)
  } catch (error: any) {
    console.error('gamezcoin-api', action, error)
    return json({ error: error?.message || 'SERVER_ERROR' }, 500)
  }
})
