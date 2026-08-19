import './home-reference.css'
import { api } from './api.js'
import blockBanner from './assets/block-blast-banner.svg'
import orbitBanner from './assets/orbit-break-banner.svg'

let cache = null
let loading = null
let queued = false
let renderToken = 0

const f = (value) => new Intl.NumberFormat('vi-VN').format(Number(value || 0))
const e = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]))

const icons = {
  calendar: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/><path d="m8.5 15 2 2 4.5-5"/></svg>',
  gift: '<svg viewBox="0 0 24 24" width="29" height="29" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="9" width="18" height="12" rx="2"/><path d="M12 9v12M3 13h18M5 9h14"/><path d="M12 9c-3.5 0-6-1-6-3 0-1.3 1-2 2.1-2C10 4 12 7 12 9Zm0 0c3.5 0 6-1 6-3 0-1.3-1-2-2.1-2C14 4 12 7 12 9Z"/></svg>',
  users: '<svg viewBox="0 0 24 24" width="29" height="29" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-4 2.5-6 6-6s6 2 6 6"/><path d="M16 5.5a3 3 0 0 1 0 5.5M17 14c2.5.5 4 2.4 4 5"/></svg>',
  crown: '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m3 7 4.5 4L12 4l4.5 7L21 7l-2 11H5L3 7Z"/><path d="M5 21h14"/></svg>'
}

function toast(message, type = '') {
  const root = document.querySelector('#toast-root')
  if (!root) return
  const node = document.createElement('div')
  node.className = `toast ${type}`
  node.textContent = message
  root.append(node)
  requestAnimationFrame(() => node.classList.add('show'))
  setTimeout(() => node.remove(), 3200)
}

async function getData(force = false) {
  if (cache && !force) return cache
  if (!loading) {
    loading = api('bootstrap').then((data) => {
      cache = data
      return data
    }).finally(() => { loading = null })
  }
  return loading
}

function goTo(tab) {
  document.querySelector(`.shell>nav [data-tab="${tab}"]`)?.click()
}

function syncHeaderHome(data, isHome) {
  const actions = document.querySelector('.gc-header-actions')
  if (!actions) return

  if (!isHome) {
    actions.classList.remove('home-mode')
    actions.querySelector('.gc-home-greeting')?.remove()
    return
  }

  actions.classList.add('home-mode')
  let greeting = actions.querySelector('.gc-home-greeting')
  if (!greeting) {
    greeting = document.createElement('div')
    greeting.className = 'gc-home-greeting'
    const bell = actions.querySelector('.gc-notification-button')
    actions.insertBefore(greeting, bell || null)
  }
  const name = data?.profile?.display_name || 'Người chơi'
  greeting.innerHTML = `<small>Xin chào,</small><strong>${e(name)}</strong>`
}

function gameCard(gameId, data) {
  const game = (data?.games || []).find((item) => item.id === gameId)
  if (!game || game.enabled === false) return ''
  const isBlock = gameId === 'block-blast'
  const banner = isBlock ? blockBanner : orbitBanner
  const name = isBlock ? (game.name || 'Block Blast') : 'ORBIT BREAK'
  const logo = isBlock
    ? '<span class="gc-ref-game-logo"><svg viewBox="0 0 44 44" width="28" height="28"><rect x="4" y="4" width="14" height="14" rx="3" fill="#92f5ff"/><rect x="26" y="4" width="14" height="14" rx="3" fill="#72a7ff"/><rect x="4" y="26" width="14" height="14" rx="3" fill="#7d78ff"/><rect x="26" y="26" width="14" height="14" rx="3" fill="#b153ff"/></svg></span>'
    : `<span class="gc-ref-game-logo"><img src="${orbitBanner}" alt="ORBIT BREAK"></span>`

  return `<article class="gc-ref-game">
    <div class="gc-ref-game-banner"><img src="${banner}" alt="${e(name)}"></div>
    <div class="gc-ref-game-info">
      ${logo}
      <div class="gc-ref-game-copy"><strong>${e(name)}</strong><span>10 điểm = 1 coin</span></div>
    </div>
    <button type="button" data-ref-game="${gameId}">Chơi và Kiếm Tiền</button>
  </article>`
}

function launchFromHome(gameId) {
  window.__gcPremiumHomeLaunch = true
  goTo('checkin')
  let tries = 0
  const timer = setInterval(() => {
    tries += 1
    const button = document.querySelector(`#view [data-home-game="${gameId}"]`)
    if (button) {
      clearInterval(timer)
      button.click()
      setTimeout(() => { window.__gcPremiumHomeLaunch = false }, 1800)
      return
    }
    if (tries > 30) {
      clearInterval(timer)
      window.__gcPremiumHomeLaunch = false
      toast('Không thể mở game. Hãy thử lại.', 'bad')
    }
  }, 80)
}

async function renderHomeReference() {
  if (window.__gcPremiumHomeLaunch) return
  const view = document.querySelector('#view')
  const active = document.querySelector('.shell>nav button.on')?.dataset.tab
  if (!view || active !== 'games') return
  if (view.dataset.gcReferenceHome === '1') return

  const token = ++renderToken
  view.dataset.gcReferenceHome = 'loading'
  try {
    const data = await getData()
    if (token !== renderToken || window.__gcPremiumHomeLaunch) return
    if (!view.isConnected || document.querySelector('.shell>nav button.on')?.dataset.tab !== 'games') return

    const reward = Number(data.settings?.daily_checkin_coin || 100)
    const inviter = Number(data.settings?.referral_inviter_coin || 0)
    const balance = Number(data.wallet?.balance || 0)
    const games = ['block-blast', 'orbit-break'].map((id) => gameCard(id, data)).filter(Boolean).join('')

    view.dataset.gcReferenceHome = '1'
    view.dataset.gamezPage = 'home'
    view.innerHTML = `<div class="gc-ref-home">
      <section class="gc-ref-hero">
        <div class="gc-ref-hero-grid">
          <div class="gc-ref-hero-copy">
            <div class="gc-ref-balance-label">Số dư khả dụng</div>
            <div class="gc-ref-balance">${f(balance)}<small>coin</small></div>
            <p>Coin từ chơi game, điểm danh và giới thiệu bạn bè có thể rút được tiền.</p>
          </div>
          <div class="gc-ref-wallet-art" aria-hidden="true">
            <div class="gc-ref-card-shape second"></div><div class="gc-ref-card-shape"></div>
            <div class="gc-ref-wallet"></div>
            <i class="gc-ref-coin c1">G</i><i class="gc-ref-coin c2">G</i><i class="gc-ref-coin c3">G</i>
          </div>
        </div>
        <div class="gc-ref-hero-actions">
          <button class="gc-ref-earn" id="gc-ref-earn">✦ &nbsp; Kiếm thưởng <span>›</span></button>
          <button class="gc-ref-withdraw" id="gc-ref-withdraw">▣ &nbsp; Rút tiền</button>
        </div>
      </section>

      <section class="gc-ref-quick">
        <button class="q1" id="gc-ref-checkin"><span class="gc-ref-quick-icon">${icons.calendar}</span><b>Điểm danh</b><small>+${f(reward)} coin</small></button>
        <button class="q2" id="gc-ref-tasks"><span class="gc-ref-quick-icon">${icons.gift}</span><b>Nhiệm vụ</b><small>Làm để nhận coin</small></button>
        <button class="q3" id="gc-ref-invite"><span class="gc-ref-quick-icon">${icons.users}</span><b>Giới thiệu</b><small>${inviter ? `+${f(inviter)} coin` : 'Nhận thưởng'}</small></button>
        <button class="q4" id="gc-ref-rank"><span class="gc-ref-quick-icon">${icons.crown}</span><b>Bảng xếp hạng</b><small>Top cao thủ</small></button>
      </section>

      <section>
        <div class="gc-ref-section-head"><h2>Chơi game kiếm coin</h2><button id="gc-ref-view-all">Xem tất cả <span>›</span></button></div>
        <div class="gc-ref-games">${games || '<div class="card">Chưa có game khả dụng.</div>'}</div>
      </section>

      <section class="gc-ref-invite">
        <span>Giới thiệu bạn bè</span>
        <h3>${inviter ? `Nhận ngay <b>+${f(inviter)} coin</b>` : 'Nhận thưởng khi mời bạn bè'}</h3>
        <button id="gc-ref-invite-now">Mời ngay</button>
        <div class="gc-ref-gift" aria-hidden="true"><div class="gc-ref-bow"></div><div class="gc-ref-bow b2"></div><div class="gc-ref-gift-box"></div></div>
      </section>
      <div class="gc-ref-dots"><i></i><i></i><i></i><i></i></div>
    </div>`

    syncHeaderHome(data, true)

    view.querySelector('#gc-ref-earn')?.addEventListener('click', () => goTo('checkin'))
    view.querySelector('#gc-ref-withdraw')?.addEventListener('click', () => goTo('wallet'))
    view.querySelector('#gc-ref-tasks')?.addEventListener('click', () => goTo('checkin'))
    view.querySelector('#gc-ref-invite')?.addEventListener('click', () => goTo('ref'))
    view.querySelector('#gc-ref-invite-now')?.addEventListener('click', () => goTo('ref'))
    view.querySelector('#gc-ref-view-all')?.addEventListener('click', () => goTo('checkin'))
    view.querySelector('#gc-ref-rank')?.addEventListener('click', () => toast('Bảng xếp hạng đang được hoàn thiện.', 'ok'))
    view.querySelectorAll('[data-ref-game]').forEach((button) => button.addEventListener('click', () => launchFromHome(button.dataset.refGame)))
    view.querySelector('#gc-ref-checkin')?.addEventListener('click', async (event) => {
      const button = event.currentTarget
      button.disabled = true
      try {
        const result = await api('checkin')
        toast(result.result?.claimed ? `+${f(result.result.reward_coin)} coin` : 'Hôm nay bạn đã điểm danh.', 'ok')
        await getData(true)
        view.dataset.gcReferenceHome = ''
        renderHomeReference()
      } catch (error) {
        toast(error?.message || 'Không thể điểm danh.', 'bad')
        button.disabled = false
      }
    })
  } catch (error) {
    if (view?.isConnected) view.dataset.gcReferenceHome = ''
  }
}

function sync() {
  const active = document.querySelector('.shell>nav button.on')?.dataset.tab
  if (active === 'games') {
    renderHomeReference()
  } else {
    syncHeaderHome(cache, false)
    const view = document.querySelector('#view')
    if (view) view.dataset.gcReferenceHome = ''
  }
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
