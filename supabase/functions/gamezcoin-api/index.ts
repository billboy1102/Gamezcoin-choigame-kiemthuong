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

function bangkokDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const get = (type: string) => parts.find((part) => part.type === type)?.value || ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

const dailyTaskKey = (userId: string, task: string, date: string) => `daily_task:${task}:${userId}:${date}`

async function getDailyTasks(admin: any, userId: string) {
  const date = bangkokDate()
  const [entriesQ, playRewardQ, shareRewardQ] = await Promise.all([
    admin.from('gamezcoin_daily_game_entries').select('entry_id', { count: 'exact', head: true }).eq('user_id', userId).eq('task_date', date),
    admin.from('gamezcoin_wallet_ledger').select('id').eq('idempotency_key', dailyTaskKey(userId, 'play10', date)).maybeSingle(),
    admin.from('gamezcoin_wallet_ledger').select('id').eq('idempotency_key', dailyTaskKey(userId, 'share', date)).maybeSingle(),
  ])
  const firstError = [entriesQ, playRewardQ, shareRewardQ].find((query: any) => query?.error)?.error
  if (firstError) throw firstError
  return {
    date,
    play_count: Math.min(Number(entriesQ.count || 0), 10),
    play_target: 10,
    play_claimed: !!playRewardQ.data,
    share_claimed: !!shareRewardQ.data,
  }
}

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

    if (action === 'daily_tasks') {
      return json({ tasks: await getDailyTasks(admin, user.id) })
    }

    if (action === 'record_daily_game_entry') {
      const gameId = String(body?.game_id || '')
      const entryId = String(body?.entry_id || '').trim()
      if (!gameId || entryId.length < 8 || entryId.length > 160) return json({ error: 'INVALID_ENTRY' }, 400)
      const { data, error } = await admin.rpc('gamezcoin_record_daily_game_entry', {
        p_user_id: user.id, p_game_id: gameId, p_entry_id: entryId,
      })
      if (error) return json({ error: error.message || 'TASK_PROGRESS_FAILED' }, 400)
      return json({ result: data, tasks: await getDailyTasks(admin, user.id) })
    }

    if (action === 'claim_daily_task') {
      const task = String(body?.task || '')
      if (task !== 'play10' && task !== 'share') return json({ error: 'INVALID_TASK' }, 400)
      const { data, error } = await admin.rpc('gamezcoin_claim_daily_task', { p_user_id: user.id, p_task: task })
      if (error) return json({ error: error.message || 'TASK_REWARD_FAILED' }, 400)
      return json({ result: data, tasks: await getDailyTasks(admin, user.id) })
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
