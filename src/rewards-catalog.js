import './rewards-catalog.css'
import { api } from './api.js'
import blockBanner from './assets/block-blast-banner.webp'
import orbitBanner from './assets/orbit-break-banner.webp'
import walletArt from './assets/home-wallet-reference-crop.svg'

let cache = null
let loading = null
let queued = false
let launchTimer = null

const e = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]))

const icons = {
  sparkle: '<svg viewBox="0 0 24 24"><path d="m12 2 1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2Z"/><path d="m19 14 .8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z"/></svg>',
  grid: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>',
  puzzle: '<svg viewBox="0 0 24 24"><path d="M8 3h4v3a2.5 2.5 0 1 0 5 0V3h4v6h-3a2.5 2.5 0 1 0 0 5h3v7h-6v-3a2.5 2.5 0 1 0-5 0v3H3v-7h3a2.5 2.5 0 1 0 0-5H3V3h5Z"/></svg>',
  gamepad: '<svg viewBox="0 0 24 24"><path d="M7.2 8h9.6a4.2 4.2 0 0 1 4 5.5l-1.2 3.8a2.3 2.3 0 0 1-3.7 1.1l-2-1.7h-3.8l-2 1.7a2.3 2.3 0 0 1-3.7-1.1l-1.2-3.8A4.2 4.2 0 0 1 7.2 8Z"/><path d="M7 12h4M9 10v4M16.5 11.5h.01M18.5 13.5h.01"/></svg>',
  strategy: '<svg viewBox="0 0 24 24"><path d="m7 4 13 13-3 3L4 7l3-3Z"/><path d="m17 4 3 3-5 5M4 17l3 3 5-5"/></svg>',
  flame: '<svg viewBox="0 0 24 24"><path d="M12.5 3c1.2 4-2.5 5.4-1.3 8.1 1-1.2 2.1-2 3.1-3 2.5 2.1 4 4.6 3.4 7.5A5.8 5.8 0 0 1 12 20a5.8 5.8 0 0 1-5.8-5.8c0-3.1 1.8-5.7 6.3-11.2Z"/></svg>',
  shield: '<svg viewBox="0 0 24 24"><path d="m12 3 7 3v5c0 4.5-2.7 7.6-7 9.5C7.7 18.6 5 15.5 5 11V6l7-3Z"/><path d="m9 12 2 2 4-4"/></svg>',
  bolt: '<svg viewBox="0 0 24 24"><path d="m13 2-8 12h6l-1 8 9-13h-6l0-7Z"/></svg>',
  coin: '<span class="gc-reward-coin">G</span>'
}

function activeRewards() {
  return document.querySelector('.shell>nav button.on')?.dataset.tab === 'checkin'
}

async function getData() {
  if (cache) return cache
  if (!loading) {
    loading = api('bootstrap')
      .then((data) => {
        cache = data
        return data
      })
      .finally(() => { loading = null })
  }
  return loading
}

function supportedGames(data) {
  return ['block-blast', 'orbit-break']
    .map((id) => (data?.games || []).find((game) => game.id === id))
    .filter((game) => game && game.enabled !== false)
}

function metaFor(game) {
  const block = game.id === 'block-blast'
  return {
    id: game.id,
    name: block ? (game.name || 'Block Blast') : 'Orbit Break',
    banner: block ? blockBanner : orbitBanner,
    badge: block ? 'Hot' : 'Mới',
    badgeClass: block ? 'hot' : 'new',
    category: block ? 'puzzle hot' : 'arcade hot',
    rate: '10 điểm = 1 coin',
    reward: block ? '+80 coin' : '+100 coin'
  }
}

function featureCard(game) {
  const m = metaFor(game)
  return `
    <article class="gc-reward-game" data-reward-category="${m.category}">
      <div class="gc-reward-game-cover">
        <img src="${m.banner}" alt="${e(m.name)}">
        <span class="gc-reward-badge ${m.badgeClass}">${m.badgeClass === 'hot' ? icons.flame : icons.shield}${m.badge}</span>
      </div>
      <div class="gc-reward-game-body">
        <h3>${e(m.name)}</h3>
        <p>${icons.coin}<span>${m.rate}</span></p>
        <div class="gc-reward-payout"><small>Thưởng đến</small><strong>${m.reward}</strong></div>
        <button type="button" data-launch-game="${m.id}">Chơi và kiếm tiền</button>
      </div>
    </article>`
}

function miniCard(game) {
  const m = metaFor(game)
  return `
    <article class="gc-reward-mini">
      <img src="${m.banner}" alt="${e(m.name)}">
      <div><strong>${e(m.name)}</strong><span>${icons.coin}${m.rate}</span></div>
      <button type="button" data-launch-game="${m.id}">Vào chơi</button>
    </article>`
}

function launchGame(gameId) {
  const home = document.querySelector('.shell>nav [data-tab="games"]')
  if (!home) return
  home.click()

  clearInterval(launchTimer)
  let tries = 0
  launchTimer = setInterval(() => {
    tries += 1
    const selector = gameId === 'block-blast' ? '#play-block' : '#play-orbit'
    const button = document.querySelector(`#view ${selector}`)
    if (button) {
      clearInterval(launchTimer)
      if (gameId === 'block-blast') button.dataset.blockIntroBypass = '1'
      button.click()
      if (gameId === 'block-blast') delete button.dataset.blockIntroBypass
      return
    }
    if (tries > 50) clearInterval(launchTimer)
  }, 80)
}

function bindCatalog(view) {
  view.querySelectorAll('[data-launch-game]').forEach((button) => {
    button.addEventListener('click', () => launchGame(button.dataset.launchGame))
  })

  const empty = view.querySelector('.gc-reward-filter-empty')
  view.querySelectorAll('[data-reward-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      view.querySelectorAll('[data-reward-filter]').forEach((node) => node.classList.remove('on'))
      button.classList.add('on')
      const filter = button.dataset.rewardFilter
      let visible = 0
      view.querySelectorAll('[data-reward-category]').forEach((card) => {
        const show = filter === 'all' || card.dataset.rewardCategory.split(' ').includes(filter)
        card.hidden = !show
        if (show) visible += 1
      })
      if (empty) empty.hidden = visible !== 0
    })
  })
}

async function renderCatalog() {
  if (!activeRewards()) return
  const view = document.querySelector('#view')
  if (!view) return
  if (view.querySelector('.gc-rewards-catalog')) return

  // Claim the legacy rewards page so home-nav.js does not repaint it afterward.
  view.dataset.gamezPage = 'rewards'
  view.dataset.rewardsCatalog = 'loading'

  try {
    const data = await getData()
    if (!activeRewards() || !view.isConnected) return
    const games = supportedGames(data)
    const cards = games.map(featureCard).join('')
    const minis = games.map(miniCard).join('')

    view.dataset.gamezPage = 'rewards'
    view.dataset.rewardsCatalog = '1'
    view.innerHTML = `
      <main class="gc-rewards-catalog">
        <section class="gc-reward-hero">
          <div class="gc-reward-hero-copy">
            <span class="gc-reward-kicker">${icons.sparkle} KIẾM THƯỞNG</span>
            <h1>Chọn app game<br><b>để kiếm tiền</b></h1>
            <p>Chơi game, hoàn thành ván chơi<br>và nhận coin quy đổi.</p>
          </div>
          <div class="gc-reward-hero-art" aria-hidden="true">
            <span class="gc-floating-pad">${icons.gamepad}</span>
            <span class="gc-floating-app a1">${icons.puzzle}</span>
            <span class="gc-floating-app a2">${icons.gamepad}</span>
            <img src="${walletArt}" alt="">
            <i class="gc-hero-coin c1">G</i><i class="gc-hero-coin c2">G</i><i class="gc-hero-coin c3">G</i>
          </div>
          <div class="gc-reward-trust-strip">
            <div>${icons.gamepad}<strong>${games.length}</strong><span>app game</span></div>
            <div>${icons.shield}<strong>Uy tín</strong><span>game đang hoạt động</span></div>
            <div>${icons.bolt}<strong>Rút tiền nhanh</strong><span>qua Ví Gamezcoin</span></div>
            <div>${icons.sparkle}<strong>Cập nhật mới</strong><span>thêm game định kỳ</span></div>
          </div>
        </section>

        <nav class="gc-reward-filters" aria-label="Bộ lọc game">
          <button class="on" type="button" data-reward-filter="all">${icons.grid}<span>Tất cả</span></button>
          <button type="button" data-reward-filter="puzzle">${icons.puzzle}<span>Puzzle</span></button>
          <button type="button" data-reward-filter="arcade">${icons.gamepad}<span>Arcade</span></button>
          <button type="button" data-reward-filter="strategy">${icons.strategy}<span>Chiến thuật</span></button>
          <button type="button" data-reward-filter="hot">${icons.flame}<span>Hot</span></button>
        </nav>

        <section class="gc-reward-featured">
          <div class="gc-reward-section-head"><h2>${icons.sparkle} App game nổi bật</h2><button type="button" data-reward-filter="all">Xem tất cả <b>›</b></button></div>
          <div class="gc-reward-game-grid">${cards}</div>
          <div class="gc-reward-filter-empty" hidden>Chưa có game trong danh mục này.</div>
        </section>

        <section class="gc-reward-updated">
          <div class="gc-reward-section-head"><h2>${icons.bolt} Mới cập nhật</h2><span>Xem thêm <b>›</b></span></div>
          <div class="gc-reward-mini-row">${minis}</div>
        </section>
      </main>`

    bindCatalog(view)
  } catch (error) {
    view.dataset.rewardsCatalog = ''
    view.innerHTML = `<section class="card center"><h3>Không tải được danh sách game</h3><p>${e(error?.message || 'Hãy thử lại.')}</p></section>`
  }
}

function sync() {
  if (!activeRewards()) return
  const view = document.querySelector('#view')
  if (!view) return
  if (!view.querySelector('.gc-rewards-catalog')) renderCatalog()
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
