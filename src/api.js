import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js'

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

const SERVER_TIMEOUT_MS = 15000
const FINISH_RETRY_DELAYS_MS = [700, 1500]
const dailyEntryIds = new Map()
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function makeDailyEntryId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
}

function currentDailyEntryId() {
  const orbitHost = document.querySelector('.orbit-host')
  if (orbitHost) {
    if (!orbitHost.dataset.dailyEntryId) orbitHost.dataset.dailyEntryId = makeDailyEntryId()
    return orbitHost.dataset.dailyEntryId
  }
  return makeDailyEntryId()
}

function isTransientFinishError(error) {
  const status = Number(error?.status || 0)
  const message = String(error?.message || '')
  return status === 401 || status >= 500 || /SERVER_TIMEOUT|Failed to send a request to the Edge Function|Failed to fetch|Load failed|Network request failed|FunctionsFetchError/i.test(message)
}

async function invokeOnce(functionName, action, payload = {}) {
  let timer
  try {
    const request = supabase.functions.invoke(functionName, { body: { action, ...payload } })
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('SERVER_TIMEOUT')), SERVER_TIMEOUT_MS)
    })
    const { data, error } = await Promise.race([request, timeout])
    if (error) {
      let message = error.message || 'Không thể kết nối máy chủ'
      let status = Number(error.context?.status || 0)
      try {
        const details = await error.context?.json?.()
        if (details?.error) message = details.error
      } catch {}
      const wrapped = new Error(message)
      wrapped.name = error.name || 'EdgeFunctionError'
      wrapped.status = status
      throw wrapped
    }
    if (data?.error) throw new Error(data.error)
    return data
  } finally {
    clearTimeout(timer)
  }
}

async function invoke(functionName, action, payload = {}) {
  const retryDelays = functionName === 'gamezcoin-api' && action === 'finish_game' ? FINISH_RETRY_DELAYS_MS : []
  let attempt = 0
  while (true) {
    try {
      return await invokeOnce(functionName, action, payload)
    } catch (error) {
      if (attempt >= retryDelays.length || !isTransientFinishError(error)) throw error
      await sleep(retryDelays[attempt])
      attempt += 1
    }
  }
}

export async function api(action, payload = {}) {
  const requestPayload = { ...(payload || {}) }
  const sessionId = String(requestPayload.session_id || '')

  if (action === 'finish_game' && sessionId && !requestPayload.daily_entry_id) {
    const dailyEntryId = dailyEntryIds.get(sessionId)
    if (dailyEntryId) requestPayload.daily_entry_id = dailyEntryId
  }

  const data = await invoke('gamezcoin-api', action, requestPayload)

  if (action === 'start_game' && data?.session?.id) {
    dailyEntryIds.set(String(data.session.id), currentDailyEntryId())
  }

  if (action === 'finish_game' && sessionId) {
    dailyEntryIds.delete(sessionId)
    if (data?.tasks) {
      window.dispatchEvent(new CustomEvent('gamezcoin:daily-tasks', { detail: data.tasks }))
    }
  }

  return data
}

export const adminApi = (action, payload) => invoke('gamezcoin-admin', action, payload)
