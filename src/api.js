import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js'

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

const SERVER_TIMEOUT_MS = 15000

async function invoke(functionName, action, payload = {}) {
  let timer
  try {
    const request = supabase.functions.invoke(functionName, { body: { action, ...payload } })
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('SERVER_TIMEOUT')), SERVER_TIMEOUT_MS)
    })
    const { data, error } = await Promise.race([request, timeout])
    if (error) {
      let message = error.message || 'Không thể kết nối máy chủ'
      try {
        const details = await error.context?.json?.()
        if (details?.error) message = details.error
      } catch {}
      throw new Error(message)
    }
    if (data?.error) throw new Error(data.error)
    return data
  } finally {
    clearTimeout(timer)
  }
}

export const api = (action, payload) => invoke('gamezcoin-api', action, payload)
export const adminApi = (action, payload) => invoke('gamezcoin-admin', action, payload)
