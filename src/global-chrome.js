import './global-chrome.css'
import { api, supabase } from './api.js'

let cache = null
let avatarUrl = ''
let loading = false
let queued = false
let lastShell = null

const f = (value) => new Intl.NumberFormat('vi-VN').format(Number(value || 0))
const e = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]))

const bellIcon = '<svg viewBox="0 0 24 24"><path d="M18 8.8a6 6 0 0 0-12 0c0 7-3 7.2-3 8.7h18c0-1.5-3-1.7-3-8.7Z"/><path d="M9.7 20a2.5 2.5 0 0 0 4.6 0"/></svg>'

const navLabels = {
  games: 'Trang chủ',
  checkin: 'Kiếm Thưởng',
  wallet: 'Ví',
  ref: 'Giới Thiệu',
  account: 'Tài Khoản'
}

function goTo(tab) {
  document.querySelector(`.shell>nav [data-tab="${tab}"]`)?.click()
}

function fallbackData() {
  const oldHeader = document.querySelector('.shell>header')
  const text = oldHeader?.textContent || ''
  const balanceMatch = text.match(/[\d][\d.,]*/)
  const balance = balanceMatch ? Number(balanceMatch[0].replace(/\./g, '').replace(',', '.')) || 0 : 0
  const oldName = oldHeader?.querySelector('strong')?.textContent?.trim() || 'Người chơi'
  return { profile: { display_name: oldName }, wallet: { balance } }
}

function renderHeader(data = cache || fallbackData()) {
  const header = document.querySelector('.shell>header')
  if (!header) return
  const name = data?.profile?.display_name || 'Người chơi'
  const initial = e(name.charAt(0).toUpperCase() || 'G')
  const balance = f(data?.wallet?.balance || 0)

  header.classList.add('gc-premium-header')
  header.innerHTML = `
    <div class="gc-premium-user">
      <button type="button" class="gc-premium-avatar" id="gc-global-profile" aria-label="Tài khoản">${avatarUrl ? `<img src="${e(avatarUrl)}" alt="${e(name)}" referrerpolicy="no-referrer">` : `<span>${initial}</span>`}</button>
      <div class="gc-premium-greeting"><small>Xin chào,</small><strong>${e(name)} <i>✓</i></strong></div>
    </div>
    <div class="gc-premium-head-actions">
      <button type="button" class="gc-premium-bell" id="gc-global-bell" aria-label="Thông báo">${bellIcon}<em>3</em></button>
      <button type="button" class="gc-premium-head-balance" id="gc-global-wallet"><span>G</span><strong>${balance}</strong><small>coin</small></button>
    </div>`

  header.querySelector('#gc-global-profile')?.addEventListener('click', () => goTo('account'))
  header.querySelector('#gc-global-wallet')?.addEventListener('click', () => goTo('wallet'))
  header.querySelector('#gc-global-bell')?.addEventListener('click', () => {
    const root = document.querySelector('#toast-root')
    if (!root) return
    const node = document.createElement('div')
    node.className = 'toast ok'
    node.textContent = 'Chưa có thông báo mới.'
    root.append(node)
    requestAnimationFrame(() => node.classList.add('show'))
    setTimeout(() => node.remove(), 2500)
  })
}

function normalizeNav() {
  document.querySelectorAll('.shell>nav [data-tab]').forEach((button) => {
    const label = navLabels[button.dataset.tab]
    if (!label) return
    const text = button.querySelector('small')
    if (text && text.textContent !== label) text.textContent = label
    button.setAttribute('aria-label', label)
  })
}

async function hydrate(shell) {
  if (loading || !shell?.isConnected) return
  loading = true
  try {
    const [data, userResult] = await Promise.all([
      api('bootstrap'),
      supabase.auth.getUser().catch(() => ({ data: null }))
    ])
    cache = data
    avatarUrl = userResult?.data?.user?.user_metadata?.avatar_url || userResult?.data?.user?.user_metadata?.picture || ''
    if (shell.isConnected && shell === document.querySelector('.shell')) renderHeader(cache)
  } catch (error) {
    console.error('Không thể đồng bộ header Gamezcoin', error)
  } finally {
    loading = false
  }
}

function sync() {
  const shell = document.querySelector('.shell')
  if (!shell) {
    lastShell = null
    return
  }

  normalizeNav()

  if (shell !== lastShell) {
    lastShell = shell
    cache = null
    renderHeader(fallbackData())
    hydrate(shell)
    return
  }

  const header = shell.querySelector(':scope>header')
  if (header && !header.classList.contains('gc-premium-header')) renderHeader(cache || fallbackData())
}

function schedule() {
  if (queued) return
  queued = true
  queueMicrotask(() => {
    queued = false
    sync()
  })
}

new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true })
window.addEventListener('pageshow', schedule)
schedule()
