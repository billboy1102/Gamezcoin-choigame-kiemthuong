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

  if (gameId === 'block-blast') button.dataset.blockIntroBypass = '1'
  button.click()
  if (gameId === 'block-blast') delete button.dataset.blockIntroBypass
  return true
}

function gameCard(gameId, data, badgeText = '') {
  const game = (data?.games || []).find((item) => item.id === gameId)
  if (!game || game.enabled === false) return ''

  const isBlock = gameId === 'block-blast'
  const icon = isBlock ? '🧩' : '<span class="orbit-card-icon"><i></i></span>'
  const name = isBlock ? (game.name || 'Block Blast') : 'ORBIT BREAK'
  const description = isBlock
    ? (game.description || 'Kéo thả khối vào lưới 8×8, phá hàng/cột và tạo combo.')
    : 'Bấm đúng nhịp để chuyển quỹ đạo.'
  const buttonId = isBlock ? 'play-block' : 'play-orbit'
  const badge = badgeText || (isBlock ? 'BLOCK BLAST' : 'ORBIT BREAK')

  return `
    <article class="card game block-card home-game-card ${isBlock ? '' : 'home-orbit-card'}">
      <div class="gi">${icon}</div>
      <div>
        <strong>${e(name)}</strong>
        <small>${e(description)}</small>
        <em>10 điểm = 1 coin</em>
        <span class="block-badge">${e(badge)}</span>
      </div>
      <button id="${buttonId}" data-home-game="${gameId}">Chơi</button>
    </article>`
}

function bindGameButtons(view) {
  view.querySelectorAll('[data-home-game]').forEach((button) => {
    button.onclick = () => launchGame(button.dataset.homeGame)
  })
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
    const cards = supported.map((game) => gameCard(game.id, data, 'GAME DỄ CHƠI')).join('')

    view.innerHTML = `
      <section class="rewards-head">
        <span>🎮 KIẾM THƯỞNG</span>
        <h1>Chơi càng hay, nhận càng nhiều</h1>
        <p>Chọn game, chơi lấy điểm và nhận coin để quy đổi ra tiền.</p>
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
    // Trang chủ cũ đã bị loại bỏ hoàn toàn. home-reference.js là renderer Home duy nhất.
    return
  }

  if (active === 'checkin') {
    renderRewards()
  }
}

new MutationObserver(scheduleSync).observe(document.documentElement, { childList: true, subtree: true })
window.addEventListener('pageshow', scheduleSync)
scheduleSync()
