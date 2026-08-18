import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js'

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

async function invoke(functionName, action, payload = {}) {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: { action, ...payload },
  })
  if (error) throw new Error(error.message || 'Không thể kết nối máy chủ')
  if (data?.error) throw new Error(data.error)
  return data
}

export const api = (action, payload) => invoke('gamezcoin-api', action, payload)
export const adminApi = (action, payload) => invoke('gamezcoin-admin', action, payload)
