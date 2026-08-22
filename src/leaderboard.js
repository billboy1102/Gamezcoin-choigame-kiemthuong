import './leaderboard.css'
import { supabase } from './api.js'

const trophySvg = `<svg viewBox="0 0 96 96" aria-hidden="true"><defs><linearGradient id="gcLbCup" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#5df3ff"/><stop offset=".45" stop-color="#6479ff"/><stop offset="1" stop-color="#b744ff"/></linearGradient><linearGradient id="gcLbGold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff07a"/><stop offset=".45" stop-color="#ffc52d"/><stop offset="1" stop-color="#e68a00"/></linearGradient></defs><path d="M30 18h36v13c0 18-7 31-18 31S30 49 30 31V18Z" fill="url(#gcLbCup)" stroke="#82d8ff" stroke-width="2"/><path d="M30 24H17v9c0 12 7 20 18 22M66 24h13v9c0 12-7 20-18 22" fill="none" stroke="#779dff" stroke-width="5" stroke-linecap="round"/><path d="M48 62v12M34 79h28" fill="none" stroke="#7e92ff" stroke-width="5" stroke-linecap="round"/><circle cx="48" cy="37" r="12" fill="url(#gcLbGold)"/><text x="48" y="43" text-anchor="middle" font-size="17" font-weight="900" fill="#8b5400">G</text></svg>`
const crownSvg = `<svg viewBox="0 0 32 24" aria-hidden="true"><path d="m3 7 6 5 7-9 7 9 6-5-3 13H6L3 7Z"/><path d="M7 22h18"/></svg>`
const chevronSvg = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>`
const shieldSvg = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 6v5.5c0 4.7-3.1 7.8-8 9.5-4.9-1.7-8-4.8-8-9.5V6l8-3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg>`
const clockSvg = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.4 2"/></svg>`
const laurelSvg = `<svg viewBox="0 0 140 104" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-linecap="round"><path d="M45 94C20 77 14 48 27 18"/><path d="M95 94c25-17 31-46 18-76"/></g><g fill="currentColor"><ellipse cx="27" cy="76" rx="5" ry="11" transform="rotate(-40 27 76)"/><ellipse cx="21" cy="61" rx="5" ry="11" transform="rotate(-58 21 61)"/><ellipse cx="21" cy="44" rx="5" ry="11" transform="rotate(-72 21 44)"/><ellipse cx="28" cy="28" rx="5" ry="11" transform="rotate(-88 28 28)"/><ellipse cx="37" cy="84" rx="5" ry="11" transform="rotate(-26 37 84)"/><ellipse cx="113" cy="76" rx="5" ry="11" transform="rotate(40 113 76)"/><ellipse cx="119" cy="61" rx="5" ry="11" transform="rotate(58 119 61)"/><ellipse cx="119" cy="44" rx="5" ry="11" transform="rotate(72 119 44)"/><ellipse cx="112" cy="28" rx="5" ry="11" transform="rotate(88 112 28)"/><ellipse cx="103" cy="84" rx="5" ry="11" transform="rotate(26 103 84)"/></g></svg>`

const rankAvatarSources = {
  1: '/assets/leaderboard/avatar-rank-1.webp',
  2: '/assets/leaderboard/avatar-rank-2.webp',
  3: '/assets/leaderboard/avatar-rank-3.webp',
}

const cache = new Map()
let leaderboardOpen = false
let previewLoading = false
let syncQueued = false

const f = (value) => new Intl.NumberFormat('vi-VN').format(Number(value || 0))
const e = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]))

function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'G'
  return (parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts.at(-1)[0]).toUpperCase()
}

function hueFor(value = '') {
  let hash = 0
  for (const char of String(value)) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0
  return Math.abs(hash) % 360
}

function avatar(item, extra = '', rank = 0) {
  const name = item?.display_name || 'Người chơi'
  const hue = hueFor(item?.user_id || name)
  const source = rankAvatarSources[rank]
  if (source) {
    return `<span class="gc-lb-avatar gc-lb-avatar-art rank-${rank} ${extra}" style="--gc-lb-h:${hue}"><img src="${source}" alt="" aria-hidden="true"><i>G</i></span>`
  }
  return `<span class="gc-lb-avatar ${extra}" style="--gc-lb-h:${hue}"><b>${e(initials(name))}</b><i>G</i></span>`
}

function coin(value) {
  return `<span class="gc-lb-coin"><i>G</i><strong>${f(value)}</strong><small>coin</small></span>`
}

async function fetchLeaderboard(period = 'today', limit = 60, force = false) {
  const key = `${period}:${limit}`
  const hit = cache.get(key)
  if (!force && hit && Date.now() - hit.at < 45_000) return hit.data

  const { data, error } = await supabase.functions.invoke('gamezcoin-leaderboard', {
    body: { period, limit },
  })
  if (error) {
    let message = error.message || 'Không tải được bảng xếp hạng.'
    try {
      const detail = await error.context?.json?.()
      if (detail?.error) message = detail.error
    } catch {}
    throw new Error(message)
  }
  if (data?.error) throw new Error(data.error)
  cache.set(key, { at: Date.now(), data })
  return data
}

function medal(rank) {
  return `<span class="gc-lb-medal r${rank}" aria-label="Hạng ${rank}"><i></i><b>${rank}</b><em></em></span>`
}

function podiumCard(item, rank) {
  if (!item) {
    return `<article class="gc-lb-podium-card r${rank} empty"><div class="gc-lb-empty-avatar">?</div><strong>Chưa có người chơi</strong><span>Hạng ${rank}</span></article>`
  }
  return `<article class="gc-lb-podium-card r${rank} ${item.is_me ? 'is-me' : ''}">
    ${rank === 1 ? `<span class="gc-lb-crown">${crownSvg}</span>` : ''}
    ${medal(rank)}
    <span class="gc-lb-avatar-stage">${rank === 1 ? `<span class="gc-lb-laurel">${laurelSvg}</span>` : ''}${avatar(item, 'large', rank)}</span>
    <span class="gc-lb-rank-ribbon">Hạng ${rank}</span>
    <strong>${e(item.display_name || 'Người chơi')}</strong>
    ${coin(item.earned_coin)}
  </article>`
}

function trendMarkup(item) {
  const trend = Number(item?.trend || 0)
  if (!trend) return `<span class="gc-lb-trend flat">—</span>`
  const up = trend > 0
  return `<span class="gc-lb-trend ${up ? 'up' : 'down'}"><i>${up ? '⌃' : '⌄'}</i>${Math.abs(trend)}</span>`
}

function rankRow(item) {
  return `<div class="gc-lb-row ${item.is_me ? 'is-me' : ''}">
    <b class="gc-lb-row-rank">${item.rank}</b>
    ${avatar(item)}
    <strong class="gc-lb-row-name">${e(item.display_name || 'Người chơi')}${item.is_me ? '<small>Bạn</small>' : ''}</strong>
    ${coin(item.earned_coin)}
    ${trendMarkup(item)}
  </div>`
}

function podium(items) {
  return `<div class="gc-lb-podium">
    ${podiumCard(items[1], 2)}
    ${podiumCard(items[0], 1)}
    ${podiumCard(items[2], 3)}
  </div>`
}

function previewMarkup(data) {
  const items = data?.items || []
  const rows = items.slice(3, 7)
  return `
    <div class="gc-home-lb-head">
      <div><span class="gc-home-lb-trophy">${trophySvg}</span><div><small>BẢNG XẾP HẠNG</small><h2>Top người dùng kiếm coin</h2></div></div>
      <button type="button" data-gc-open-leaderboard>Xem tất cả ${chevronSvg}</button>
    </div>
    ${podium(items)}
    <div class="gc-home-lb-list">
      ${rows.map(rankRow).join('') || '<p class="gc-lb-empty-text">Chưa có dữ liệu xếp hạng hôm nay.</p>'}
    </div>
    <button type="button" class="gc-home-lb-all" data-gc-open-leaderboard>Xem tất cả bảng xếp hạng ${chevronSvg}</button>`
}

function previewError(message) {
  return `<div class="gc-lb-state"><strong>Chưa tải được bảng xếp hạng</strong><span>${e(message)}</span><button type="button" data-gc-retry-preview>Thử lại</button></div>`
}

async function loadPreview(section, force = false) {
  if (!section || previewLoading) return
  previewLoading = true
  section.classList.add('is-loading')
  try {
    const data = await fetchLeaderboard('today', 7, force)
    if (!section.isConnected) return
    section.innerHTML = previewMarkup(data)
    section.querySelector('[data-gc-retry-preview]')?.remove()
  } catch (error) {
    if (section.isConnected) section.innerHTML = previewError(error?.message || 'Không thể kết nối máy chủ.')
  } finally {
    previewLoading = false
    section?.classList.remove('is-loading')
  }
}

function mountHomePreview() {
  const home = document.querySelector('.gc-premium-home')
  if (!home) return
  const referral = home.querySelector('.gc-premium-referral')
  if (!referral) return
  home.querySelector('.gc-premium-dots')?.remove()
  let section = home.querySelector('.gc-home-leaderboard')
  if (!section) {
    section = document.createElement('section')
    section.className = 'gc-home-leaderboard'
    section.innerHTML = '<div class="gc-lb-skeleton"><i></i><i></i><i></i></div>'
    referral.insertAdjacentElement('afterend', section)
    void loadPreview(section)
  }
}

function ensureLeaderboardNav() {
  const nav = document.querySelector('.shell>nav')
  if (!nav) return
  const account = nav.querySelector('[data-tab="account"]')
  account?.classList.add('gc-account-nav-source')
  let button = nav.querySelector('[data-tab="leaderboard"]')
  if (!button) {
    button = document.createElement('button')
    button.type = 'button'
    button.dataset.tab = 'leaderboard'
    button.className = 'gc-leaderboard-nav'
    button.innerHTML = `<b><span class="gc-leaderboard-nav-icon">${trophySvg}</span></b><small>Bảng xếp hạng</small>`
    button.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      openLeaderboard()
    })
    if (account) nav.insertBefore(button, account)
    else nav.append(button)
  }
  if (leaderboardOpen) {
    nav.querySelectorAll('button.on').forEach((item) => item.classList.remove('on'))
    button.classList.add('on')
  }
}

function fullHero() {
  return `<section class="gc-lb-hero">
    <div class="gc-lb-hero-copy"><small>🏆 &nbsp; BẢNG XẾP HẠNG</small><h1>Top người dùng kiếm coin</h1><p>Xếp hạng người dùng theo tổng số coin kiếm được thực tế trên Gamezcoin.</p>
      <div class="gc-lb-trust"><span>${shieldSvg}<b>Minh bạch</b></span><span>${clockSvg}<b>Cập nhật thời gian thực</b></span><span>${shieldSvg}<b>Uy tín</b></span></div>
    </div>
    <div class="gc-lb-hero-art"><i></i>${trophySvg}</div>
  </section>`
}

function fullList(items) {
  return `<section class="gc-lb-ranking-card gc-lb-top-three-only" aria-label="Ba người dùng kiếm nhiều coin nhất">
    ${podium(items.slice(0, 3))}
  </section>`
}

async function renderLeaderboardData(token) {
  const content = document.querySelector('.gc-lb-content')
  if (!content) return
  content.innerHTML = '<div class="gc-lb-skeleton full"><i></i><i></i><i></i></div>'
  try {
    const data = await fetchLeaderboard('all', 3)
    if (!leaderboardOpen || token !== Number(document.querySelector('.gc-leaderboard-page')?.dataset.token || -1)) return
    content.innerHTML = fullList(data?.items || [])
  } catch (error) {
    content.innerHTML = `<div class="gc-lb-state"><strong>Không tải được bảng xếp hạng</strong><span>${e(error?.message || 'Không thể kết nối máy chủ.')}</span><button type="button" data-gc-retry-full>Thử lại</button></div>`
  }
}

function openLeaderboard() {
  const view = document.querySelector('.shell>#view, #view')
  if (!view) return
  leaderboardOpen = true
  ensureLeaderboardNav()
  document.querySelectorAll('.shell>nav button.on').forEach((item) => item.classList.remove('on'))
  document.querySelector('.shell>nav [data-tab="leaderboard"]')?.classList.add('on')

  const token = Date.now()
  view.dataset.gamezPage = 'leaderboard'
  view.dataset.gcPremiumHome = ''
  view.innerHTML = `<main class="gc-leaderboard-page" data-token="${token}">
    ${fullHero()}
    <div class="gc-lb-content"></div>
  </main>`
  window.scrollTo({ top: 0, behavior: 'smooth' })
  void renderLeaderboardData(token)
}

function handleDocumentClick(event) {
  const rankShortcut = event.target.closest?.('#gc-premium-rank')
  const openButton = event.target.closest?.('[data-gc-open-leaderboard]')
  if (rankShortcut || openButton) {
    event.preventDefault()
    event.stopImmediatePropagation()
    openLeaderboard()
    return
  }

  const nativeNav = event.target.closest?.('.shell>nav [data-tab]:not([data-tab="leaderboard"])')
  if (nativeNav) leaderboardOpen = false

  if (event.target.closest?.('[data-gc-retry-preview]')) {
    const section = document.querySelector('.gc-home-leaderboard')
    if (section) void loadPreview(section, true)
  }

  if (event.target.closest?.('[data-gc-retry-full]') && leaderboardOpen) {
    const token = Number(document.querySelector('.gc-leaderboard-page')?.dataset.token || Date.now())
    void renderLeaderboardData(token)
  }
}

document.addEventListener('click', handleDocumentClick, true)

function sync() {
  ensureLeaderboardNav()
  mountHomePreview()
  if (leaderboardOpen && !document.querySelector('.gc-leaderboard-page')) openLeaderboard()
}

function schedule() {
  if (syncQueued) return
  syncQueued = true
  queueMicrotask(() => {
    syncQueued = false
    sync()
  })
}

new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true })
window.addEventListener('pageshow', schedule)
schedule()
