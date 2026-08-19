import './home-nav.css'
import { api } from './api.js'

let cachedData = null
let loadingData = null
let launchingGame = null
let syncQueued = false
let launchTimer = null

const f = (value) => new Intl.NumberFormat('vi-VN').format(Number(value || 0))
const e = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]))

const navLabels = {
  games: ['🏠', 'Trang chủ'],
  checkin: ['🎮', 'Kiếm Thưởng'],
  wallet: ['🪙', 'Ví'],
  ref: ['👥', 'Giới Thiệu'],
  account: ['👤', 'Tài Khoản']
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

function updateHeaderBalance(data) {
  const button = document.querySelector('.shell>header .balance')
  if (!button || !data?.wallet) return
  button.innerHTML = `<span>G</span>${f(data.wallet.balance)} coin`
}

async function getData(force = false) {
  if (cachedData && !force) return cachedData
  if (!loadingData) {
    loadingData = api('bootstrap')
      .then((data) => {
        cachedData = data
        updateHeaderBalance(data)
        return data
      })
      .finally(() => { loadingData = null })
  }
  return loadingData
}

function relabelNav() {
  document.querySelectorAll('.shell>nav [data-tab]').forEach((button) => {
    const pair = navLabels[button.dataset.tab]
    if (!pair) return
    const icon = button.querySelector('b')
    const text = button.querySelector('small')
    if (icon && icon.textContent !== pair[0]) icon.textContent = pair[0]
    if (text && text.textContent !== pair[1]) text.textContent = pair[1]
    button.setAttribute('aria-label', pair[1])
  })
}

function goTo(tab) {
  const button = document.querySelector(`.shell>nav [data-tab="${tab}"]`)
  button?.click()
}

function launchGame(gameId) {
  launchingGame = gameId
  clearTimeout(launchTimer)
  launchTimer = setTimeout(() => {
    if (!launchingGame) return
    launchingGame = null
    toast('Game tải quá lâu. Hãy thử lại.', 'bad')
    scheduleSync()
  }, 7000)

  const homeButton = document.querySelector('.shell>nav [data-tab="games"]')
  if (homeButton) homeButton.click()
}

function tryLaunchOriginalGame() {
  if (!launchingGame) return false
  const selector = launchingGame === 'block-blast' ? '#play-block' : launchingGame === 'orbit-break' ? '#play-orbit' : null
  if (!selector) {
    launchingGame = null
    return false
  }

  const button = document.querySelector(`#view ${selector}`)
  if (!button) {
    setTimeout(scheduleSync, 90)
    return true
  }

  const gameId = launchingGame
  launchingGame = null
  clearTimeout(launchTimer)

  // The home/rewards cards already show Block Blast's introduction once.
  // When routing back through the original game button, bypass the second copy
  // of the intro and start the existing gameplay handler directly.
  if (gameId === 'block-blast') button.dataset.blockIntroBypass = '1'
  button.click()
  if (gameId === 'block-blast') delete button.dataset.blockIntroBypass
  return true
}

function gameCard(gameId, data) {
  const game = (data?.games || []).find((item) => item.id === gameId)
  if (!game || game.enabled === false) return ''

  const isBlock = gameId === 'block-blast'
  const icon = isBlock ? '🧩' : '<span class="orbit-card-icon"><i></i></span>'
  const name = isBlock ? (game.name || 'Block Blast') : 'ORBIT BREAK'
  const description = isBlock
    ? (game.description || 'Kéo thả khối vào lưới 8×8, phá hàng/cột và tạo combo.')
    : 'Bấm đúng nhịp để chuyển quỹ đạo.'
  const buttonId = isBlock ? 'play-block' : 'play-orbit'
  const badge = isBlock ? 'BLOCK BLAST' : 'ORBIT BREAK'

  return `
    <article class="card game block-card home-game-card ${isBlock ? '' : 'home-orbit-card'}">
      <div class="gi">${icon}</div>
      <div>
        <strong>${e(name)}</strong>
        <small>${e(description)}</small>
        <em>10 điểm = 1 coin</em>
        <span class="block-badge">${badge}</span>
      </div>
      <button id="${buttonId}" data-home-game="${gameId}">Chơi</button>
    </article>`
}

function bindGameButtons(view) {
  view.querySelectorAll('[data-home-game]').forEach((button) => {
    button.onclick = () => launchGame(button.dataset.homeGame)
  })
}

async function renderHome() {
  const view = document.querySelector('#view')
  if (!view || view.dataset.gamezPage === 'home') return
  view.dataset.gamezPage = 'home'
  view.innerHTML = '<div class="loader"></div>'

  try {
    const data = await getData()
    if (!document.body.contains(view) || document.querySelector('.shell>nav .on')?.dataset.tab !== 'games' || launchingGame) return

    const reward = Number(data.settings?.daily_checkin_coin || 100)
    const code = data.profile?.referral_code || ''
    const inviter = Number(data.settings?.referral_inviter_coin || 0)
    const games = ['block-blast', 'orbit-break'].map((id) => gameCard(id, data)).filter(Boolean).join('')

    view.innerHTML = `
      <section class="home-welcome">
        <div>
          <span class="home-kicker">GAMEZCOIN</span>
          <h1>Chơi Game & Kiếm Thưởng</h1>
          <p>Chơi mini game, tích lũy điểm và nhận coin. Điểm được server xác minh trước khi cộng vào ví.</p>
        </div>
        <div class="home-coin">G</div>
      </section>

      <section class="home-section">
        <div class="home-section-title"><div><small>MỖI NGÀY</small><h2>Điểm danh</h2></div><span>📅</span></div>
        <div class="home-quick-card home-checkin-card">
          <div><b>+${f(reward)} coin</b><p>Nhận thưởng điểm danh mỗi ngày.</p></div>
          <button id="home-checkin">Điểm danh</button>
        </div>
      </section>

      <section class="home-section">
        <div class="home-section-title"><div><small>MỜI BẠN BÈ</small><h2>Giới thiệu</h2></div><span>👥</span></div>
        <div class="home-quick-card home-ref-card">
          <div><b>${e(code || 'Mã giới thiệu')}</b><p>${inviter ? `Nhận +${f(inviter)} coin khi lời mời đủ điều kiện.` : 'Chia sẻ mã của bạn để nhận thưởng.'}</p></div>
          <button id="home-referral">Xem</button>
        </div>
      </section>

      <section class="home-section home-featured">
        <div class="home-section-title home-games-title">
          <div><small>NỔI BẬT</small><h2>Mini game</h2></div>
          <button id="home-view-all">Xem tất cả <span>›</span></button>
        </div>
        <div class="games">${games || '<section class="card"><p>Chưa có mini game khả dụng.</p></section>'}</div>
      </section>`

    view.querySelector('#home-checkin')?.addEventListener('click', async (event) => {
      const button = event.currentTarget
      button.disabled = true
      button.textContent = 'Đang nhận...'
      try {
        const result = await api('checkin')
        toast(result.result?.claimed ? `+${f(result.result.reward_coin)} coin` : 'Hôm nay bạn đã điểm danh.', 'ok')
        await getData(true)
        view.dataset.gamezPage = ''
        renderHome()
      } catch (error) {
        toast(error?.message || 'Không thể điểm danh.', 'bad')
        button.disabled = false
        button.textContent = 'Điểm danh'
      }
    })

    view.querySelector('#home-referral')?.addEventListener('click', () => goTo('ref'))
    view.querySelector('#home-view-all')?.addEventListener('click', () => goTo('checkin'))
    bindGameButtons(view)
  } catch (error) {
    view.innerHTML = `<section class="card center"><h3>Không tải được Trang chủ</h3><p>${e(error?.message || 'Hãy thử lại.')}</p><button class="primary" id="home-retry">Thử lại</button></section>`
    view.querySelector('#home-retry')?.addEventListener('click', () => {
      view.dataset.gamezPage = ''
      cachedData = null
      renderHome()
    })
  }
}

async function renderRewards() {
  const view = document.querySelector('#view')
  if (!view || view.dataset.gamezPage === 'rewards') return
  view.dataset.gamezPage = 'rewards'
  view.innerHTML = '<div class="loader"></div>'

  try {
    const data = await getData()
    if (!document.body.contains(view) || document.querySelector('.shell>nav .on')?.dataset.tab !== 'checkin') return
    const enabled = (data.games || []).filter((game) => game.enabled !== false)
    const supported = enabled.filter((game) => game.id === 'block-blast' || game.id === 'orbit-break')
    const cards = supported.map((game) => gameCard(game.id, data)).join('')

    view.innerHTML = `
      <section class="rewards-head">
        <span>🎮 KIẾM THƯỞNG</span>
        <h1>Tất cả mini game</h1>
        <p>Chọn game, chơi lấy điểm và nhận coin sau khi server xác minh kết quả.</p>
      </section>
      <div class="rewards-count"><b>${supported.length}</b><span>game đang khả dụng</span></div>
      <div class="games rewards-games">${cards || '<section class="card"><p>Chưa có mini game khả dụng.</p></section>'}</div>`

    bindGameButtons(view)
  } catch (error) {
    view.innerHTML = `<section class="card center"><h3>Không tải được danh sách game</h3><p>${e(error?.message || 'Hãy thử lại.')}</p></section>`
  }
}

function scheduleSync() {
  if (syncQueued) return
  syncQueued = true
  queueMicrotask(() => {
    syncQueued = false
    sync()
  })
}

function sync() {
  const shell = document.querySelector('.shell')
  if (!shell) return

  relabelNav()
  const active = shell.querySelector('nav button.on')?.dataset.tab

  if (active === 'games') {
    if (tryLaunchOriginalGame()) return
    renderHome()
    return
  }

  if (active === 'checkin') {
    renderRewards()
  }
}

new MutationObserver(scheduleSync).observe(document.documentElement, { childList: true, subtree: true })
window.addEventListener('pageshow', scheduleSync)
scheduleSync()
