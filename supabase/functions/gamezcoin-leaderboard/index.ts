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

type Period = 'today' | 'week' | 'month' | 'all'
type Bounds = { start: string | null; end: string | null; previousStart: string | null; previousEnd: string | null }

const VN_OFFSET_MS = 7 * 60 * 60 * 1000

function vietnamParts(now = new Date()) {
  const shifted = new Date(now.getTime() + VN_OFFSET_MS)
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
  }
}

function localMidnightUtc(year: number, month: number, day: number) {
  return Date.UTC(year, month, day, 0, 0, 0, 0) - VN_OFFSET_MS
}

function boundsFor(period: Period, now = new Date()): Bounds {
  if (period === 'all') return { start: null, end: null, previousStart: null, previousEnd: null }
  const p = vietnamParts(now)

  if (period === 'today') {
    const startMs = localMidnightUtc(p.year, p.month, p.day)
    const endMs = startMs + 24 * 60 * 60 * 1000
    return {
      start: new Date(startMs).toISOString(),
      end: new Date(endMs).toISOString(),
      previousStart: new Date(startMs - 24 * 60 * 60 * 1000).toISOString(),
      previousEnd: new Date(startMs).toISOString(),
    }
  }

  if (period === 'week') {
    const mondayOffset = (p.weekday + 6) % 7
    const startMs = localMidnightUtc(p.year, p.month, p.day - mondayOffset)
    const endMs = startMs + 7 * 24 * 60 * 60 * 1000
    return {
      start: new Date(startMs).toISOString(),
      end: new Date(endMs).toISOString(),
      previousStart: new Date(startMs - 7 * 24 * 60 * 60 * 1000).toISOString(),
      previousEnd: new Date(startMs).toISOString(),
    }
  }

  const startMs = localMidnightUtc(p.year, p.month, 1)
  const endMs = localMidnightUtc(p.year, p.month + 1, 1)
  const previousStartMs = localMidnightUtc(p.year, p.month - 1, 1)
  return {
    start: new Date(startMs).toISOString(),
    end: new Date(endMs).toISOString(),
    previousStart: new Date(previousStartMs).toISOString(),
    previousEnd: new Date(startMs).toISOString(),
  }
}

async function fetchLedger(admin: any, start: string, end: string) {
  const rows: Array<{ user_id: string; amount: number }> = []
  const pageSize = 1000
  for (let from = 0; from < 20_000; from += pageSize) {
    const { data, error } = await admin
      .from('gamezcoin_wallet_ledger')
      .select('user_id,amount')
      .gt('amount', 0)
      .gte('created_at', start)
      .lt('created_at', end)
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1)
    if (error) throw error
    const batch = data || []
    rows.push(...batch)
    if (batch.length < pageSize) break
  }
  return rows
}

function aggregate(rows: Array<{ user_id: string; amount: number }>) {
  const totals = new Map<string, number>()
  for (const row of rows) {
    const amount = Number(row.amount || 0)
    if (!row.user_id || amount <= 0) continue
    totals.set(row.user_id, (totals.get(row.user_id) || 0) + amount)
  }
  return [...totals.entries()]
    .map(([user_id, earned_coin]) => ({ user_id, earned_coin }))
    .sort((a, b) => b.earned_coin - a.earned_coin || a.user_id.localeCompare(b.user_id))
}

async function periodRanking(admin: any, period: Period, limit: number) {
  if (period === 'all') {
    const { data, error } = await admin
      .from('gamezcoin_wallets')
      .select('user_id,lifetime_earned')
      .gt('lifetime_earned', 0)
      .order('lifetime_earned', { ascending: false })
      .limit(limit)
    if (error) throw error
    return {
      current: (data || []).map((row: any) => ({ user_id: row.user_id, earned_coin: Number(row.lifetime_earned || 0) })),
      previous: [] as Array<{ user_id: string; earned_coin: number }>,
      bounds: boundsFor(period),
    }
  }

  const bounds = boundsFor(period)
  const [currentRows, previousRows] = await Promise.all([
    fetchLedger(admin, bounds.start!, bounds.end!),
    fetchLedger(admin, bounds.previousStart!, bounds.previousEnd!),
  ])
  return {
    current: aggregate(currentRows).slice(0, limit),
    previous: aggregate(previousRows),
    bounds,
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

  const requested = String(body?.period || 'today')
  const period: Period = ['today', 'week', 'month', 'all'].includes(requested) ? requested as Period : 'today'
  const limit = Math.max(7, Math.min(100, Number(body?.limit || 60) || 60))

  try {
    const ranking = await periodRanking(admin, period, limit)
    const ids = ranking.current.map((item) => item.user_id)
    let profiles: any[] = []
    if (ids.length) {
      const { data, error } = await admin.from('gamezcoin_profiles').select('user_id,display_name').in('user_id', ids)
      if (error) throw error
      profiles = data || []
    }

    const names = new Map(profiles.map((profile: any) => [profile.user_id, profile.display_name || 'Người chơi']))
    const previousRanks = new Map(ranking.previous.map((item, index) => [item.user_id, index + 1]))
    const items = ranking.current.map((item, index) => {
      const rank = index + 1
      const previousRank = previousRanks.get(item.user_id)
      return {
        rank,
        user_id: item.user_id,
        display_name: names.get(item.user_id) || 'Người chơi',
        earned_coin: item.earned_coin,
        trend: previousRank ? previousRank - rank : 0,
        is_me: item.user_id === user.id,
      }
    })

    return json({
      period,
      generated_at: new Date().toISOString(),
      start_at: ranking.bounds.start,
      end_at: ranking.bounds.end,
      items,
    })
  } catch (error: any) {
    console.error('gamezcoin-leaderboard', error)
    return json({ error: error?.message || 'LEADERBOARD_FAILED' }, 500)
  }
})
