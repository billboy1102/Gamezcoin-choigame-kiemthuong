import './home-reference.css'
import { api, supabase } from './api.js'
import blockBanner from './assets/block-blast-banner.svg'
import orbitBanner from './assets/orbit-break-banner.svg'

let cache = null
let loading = null
let queued = false
let renderToken = 0
let avatarUrl = ''

const f = (value) => new Intl.NumberFormat('vi-VN').format(Number(value || 0))
const e = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]))

const icons = {
  bell: '<svg viewBox="0 0 24 24"><path d="M18 8.8a6 6 0 0 0-12 0c0 7-3 7.2-3 8.7h18c0-1.5-3-1.7-3-8.7Z"/><path d="M9.7 20a2.5 2.5 0 0 0 4.6 0"/></svg>',
  wallet: '<svg viewBox="0 0 24 24"><path d="M4 7.5h14a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h11"/><path d="M20 12h-5a2 2 0 0 0 0 4h5"/></svg>',
  spark: '<svg viewBox="0 0 24 24"><path d="m12 2 1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2Z"/><path d="m19 14 .8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14ZM5 14l.7 1.8L7.5 16.5l-1.8.7L5 19l-.7-1.8-1.8-.7 1.8-.7L5 14Z"/></svg>',
  withdraw: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18M16 15h3"/></svg>',
  calendar: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/><path d="m8.5 15 2 2 4.5-5"/></svg>',
  gift: '<svg viewBox="0 0 24 24"><rect x="3" y="9" width="18" height="12" rx="2"/><path d="M12 9v12M3 13h18M5 9h14"/><path d="M12 9c-3.5 0-6-1-6-3 0-1.3 1-2 2.1-2C10 4 12 7 12 9Zm0 0c3.5 0 6-1 6-3 0-1.3-1-2-2.1-2C14 4 12 7 12 9Z"/></svg>',
  users: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-4 2.5-6 6-6s6 2 6 6"/><path d="M16 5.5a3 3 0 0 1 0 5.5M17 14c2.5.5 4 2.4 4 5"/></svg>',
  crown: '<svg viewBox="0 0 24 24"><path d="m3 7 4.5 4L12 4l4.5 7L21 7l-2 11H5L3 7Z"/><path d="M5 21h14"/></svg>'
}

const walletArtwork = `
<svg viewBox="0 0 260 210" aria-hidden="true">
  <defs>
    <linearGradient id="gcCardA" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#d9d4ff"/><stop offset="1" stop-color="#7168e8"/></linearGradient>
    <linearGradient id="gcCardB" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#7567ff"/><stop offset="1" stop-color="#3739af"/></linearGradient>
    <linearGradient id="gcWallet" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#2d3046"/><stop offset=".55" stop-color="#111526"/><stop offset="1" stop-color="#070a12"/></linearGradient>
    <radialGradient id="gcCoin" cx="35%" cy="25%" r="75%"><stop stop-color="#fff47e"/><stop offset=".4" stop-color="#ffd33f"/><stop offset="1" stop-color="#e69b00"/></radialGradient>
    <filter id="gcShadow"><feDropShadow dx="0" dy="12" stdDeviation="12" flood-color="#000" flood-opacity=".38"/></filter>
  </defs>
  <g filter="url(#gcShadow)">
    <rect x="86" y="26" width="72" height="117" rx="16" transform="rotate(-13 86 26)" fill="url(#gcCardA)"/>
    <rect x="141" y="18" width="76" height="126" rx="17" transform="rotate(10 141 18)" fill="url(#gcCardB)"/>
    <rect x="72" y="75" width="158" height="104" rx="24" fill="url(#gcWallet)" stroke="#414a68" stroke-width="3"/>
    <rect x="181" y="106" width="67" height="48" rx="17" fill="#171b2d" stroke="#555d7b" stroke-width="3"/>
    <circle cx="140" cy="126" r="26" fill="#173e7d" stroke="#4d9bff" stroke-width="4"/>
    <text x="140" y="135" text-anchor="middle" font-size="26" font-weight="900" fill="#8ce8ff">G</text>
  </g>
  ${[[36,42,17],[47,167,14],[226,48,13],[223,178,17]].map(([cx,cy,r]) => `<g><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#gcCoin)" stroke="#fff2a1" stroke-width="2"/><text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="${Math.max(9,r-3)}" font-weight="900" fill="#6b4700">G</text></g>`).join('')}
</svg>`

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

async function getAvatar() {
  if (avatarUrl) return avatarUrl
  try {
    const { data } = await supabase.auth.getUser()
    avatarUrl = data?.user?.user_metadata?.avatar_url || data?.user?.user_metadata?.picture || ''
  } catch {}
  return avatarUrl
}

function goTo(tab) {
  document.querySelector(`.shell>nav [data-tab="${tab}"]`)?.click()
}

function gameCard(gameId, data) {
  const game = (data?.games || []).find((item) => item.id === gameId)
  if (!game || game.enabled === false) return ''
  const isBlock = gameId === 'block-blast'
  const banner = isBlock ? blockBanner : orbitBanner
  const name = isBlock ? (game.name || 'Block Blast') : 'ORBIT BREAK'
  const logo = isBlock
    ? '<span class="gc-premium-game-logo gc-block-logo"><i></i><i></i><i></i><i></i></span>'
    : `<span class="gc-premium-game-logo"><img src="${orbitBanner}" alt="ORBIT BREAK"></span>`

  return `<article class="gc-premium-game-card">
    <div class="gc-premium-game-banner"><img src="${banner}" alt="${e(name)}"></div>
    <div class="gc-premium-game-meta">
      ${logo}
      <div><strong>${e(name)}</strong><span>10 điểm = 1 coin</span></div>
    </div>
    <button type="button" data-premium-game="${gameId}">Chơi và Kiếm Tiền</button>
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
    if (tries > 35) {
      clearInterval(timer)
      window.__gcPremiumHomeLaunch = false
      toast('Không thể mở game. Hãy thử lại.', 'bad')
    }
  }, 80)
}

function renderHeader(data, avatar) {
  const header = document.querySelector('.shell>header')
  if (!header) return
  const name = data?.profile?.display_name || 'Người chơi'
  const initial = e(name.charAt(0).toUpperCase() || 'G')
  const balance = f(data?.wallet?.balance || 0)
  header.classList.add('gc-premium-header')
  header.innerHTML = `
    <div class="gc-premium-user">
      <button type="button" class="gc-premium-avatar" id="gc-premium-profile" aria-label="My Profile">${avatar ? `<img src="${e(avatar)}" alt="My Profile" referrerpolicy="no-referrer">` : `<span>${initial}</span>`}</button>
      <div class="gc-premium-greeting"><small>Xin chào,</small><strong>${e(name)} <i>✓</i></strong></div>
    </div>
    <div class="gc-premium-head-actions">
      <button type="button" class="gc-premium-bell" id="gc-premium-bell" aria-label="Thông báo">${icons.bell}<em>3</em></button>
      <button type="button" class="gc-premium-head-balance" id="gc-premium-wallet"><span>G</span><strong>${balance}</strong><small>coin</small></button>
    </div>`
  header.querySelector('#gc-premium-profile')?.addEventListener('click', () => goTo('account'))
  header.querySelector('#gc-premium-wallet')?.addEventListener('click', () => goTo('wallet'))
  header.querySelector('#gc-premium-bell')?.addEventListener('click', () => toast('Chưa có thông báo mới.', 'ok'))
}

function resetHeader() {
  const header = document.querySelector('.shell>header')
  if (!header?.classList.contains('gc-premium-header')) return
  header.classList.remove('gc-premium-header')
  cache = null
  document.querySelector('.shell>nav button.on')?.click()
}

async function renderHomePremium() {
  if (window.__gcPremiumHomeLaunch) return
  const view = document.querySelector('#view')
  const active = document.querySelector('.shell>nav button.on')?.dataset.tab
  if (!view || active !== 'games') return
  if (view.dataset.gcPremiumHome === '1') return

  const token = ++renderToken
  view.dataset.gcPremiumHome = 'loading'

  try {
    const [data, avatar] = await Promise.all([getData(), getAvatar()])
    if (token !== renderToken || window.__gcPremiumHomeLaunch) return
    if (!view.isConnected || document.querySelector('.shell>nav button.on')?.dataset.tab !== 'games') return

    const balance = Number(data.wallet?.balance || 0)
    const reward = Number(data.settings?.daily_checkin_coin || 100)
    const inviter = Number(data.settings?.referral_inviter_coin || 0)
    const games = ['block-blast', 'orbit-break'].map((id) => gameCard(id, data)).filter(Boolean).join('')

    renderHeader(data, avatar)
    view.dataset.gcPremiumHome = '1'
    view.dataset.gamezPage = 'home'
    view.innerHTML = `
      <main class="gc-premium-home">
        <section class="gc-premium-hero">
          <div class="gc-premium-hero-copy">
            <span>Số dư khả dụng</span>
            <h1>${f(balance)} <small>coin</small></h1>
            <p>Coin từ chơi game, điểm danh và giới thiệu bạn bè có thể rút được tiền.</p>
          </div>
          <div class="gc-premium-wallet-art">${walletArtwork}</div>
          <div class="gc-premium-hero-actions">
            <button id="gc-premium-earn">${icons.spark}<strong>Kiếm thưởng</strong><b>›</b></button>
            <button id="gc-premium-withdraw">${icons.withdraw}<strong>Rút tiền</strong></button>
          </div>
        </section>

        <section class="gc-premium-shortcuts">
          <button id="gc-premium-checkin" class="s-blue"><i>${icons.calendar}</i><strong>Điểm danh</strong><span>+${f(reward)} coin</span></button>
          <button id="gc-premium-task" class="s-purple"><i>${icons.gift}</i><strong>Nhiệm vụ</strong><span>Làm để nhận coin</span></button>
          <button id="gc-premium-ref" class="s-green"><i>${icons.users}</i><strong>Giới thiệu</strong><span>${inviter ? `+${f(inviter)} coin` : 'Nhận thưởng'}</span></button>
          <button id="gc-premium-rank" class="s-gold"><i>${icons.crown}</i><strong>Bảng xếp hạng</strong><span>Top cao thủ</span></button>
        </section>

        <section class="gc-premium-games-section">
          <div class="gc-premium-section-title"><h2>Chơi game kiếm coin</h2><button id="gc-premium-all">Xem tất cả <b>›</b></button></div>
          <div class="gc-premium-games">${games || '<div class="card">Chưa có game khả dụng.</div>'}</div>
        </section>

        <section class="gc-premium-referral">
          <div><span>Giới thiệu bạn bè</span><h3>${inviter ? `Nhận ngay <b>+${f(inviter)} coin</b>` : 'Nhận thưởng khi mời bạn bè'}</h3><button id="gc-premium-invite">Mời ngay</button></div>
          <div class="gc-premium-gift-art" aria-hidden="true"><span class="coin c1">G</span><span class="coin c2">G</span><span class="ribbon r1"></span><span class="ribbon r2"></span><span class="box"></span></div>
        </section>
        <div class="gc-premium-dots"><i></i><i></i><i></i><i></i></div>
      </main>`

    view.querySelector('#gc-premium-earn')?.addEventListener('click', () => goTo('checkin'))
    view.querySelector('#gc-premium-withdraw')?.addEventListener('click', () => goTo('wallet'))
    view.querySelector('#gc-premium-task')?.addEventListener('click', () => goTo('checkin'))
    view.querySelector('#gc-premium-ref')?.addEventListener('click', () => goTo('ref'))
    view.querySelector('#gc-premium-invite')?.addEventListener('click', () => goTo('ref'))
    view.querySelector('#gc-premium-all')?.addEventListener('click', () => goTo('checkin'))
    view.querySelector('#gc-premium-rank')?.addEventListener('click', () => toast('Bảng xếp hạng đang được hoàn thiện.', 'ok'))
    view.querySelectorAll('[data-premium-game]').forEach((button) => button.addEventListener('click', () => launchFromHome(button.dataset.premiumGame)))
    view.querySelector('#gc-premium-checkin')?.addEventListener('click', async (event) => {
      const button = event.currentTarget
      button.disabled = true
      try {
        const result = await api('checkin')
        toast(result.result?.claimed ? `+${f(result.result.reward_coin)} coin` : 'Hôm nay bạn đã điểm danh.', 'ok')
        await getData(true)
        view.dataset.gcPremiumHome = ''
        renderHomePremium()
      } catch (error) {
        toast(error?.message || 'Không thể điểm danh.', 'bad')
        button.disabled = false
      }
    })
  } catch (error) {
    if (view?.isConnected) view.dataset.gcPremiumHome = ''
  }
}

function sync() {
  const active = document.querySelector('.shell>nav button.on')?.dataset.tab
  if (active === 'games') {
    renderHomePremium()
  } else {
    const view = document.querySelector('#view')
    if (view) view.dataset.gcPremiumHome = ''
    if (document.querySelector('.gc-premium-header')) resetHeader()
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
