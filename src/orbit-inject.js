import { api } from './api.js'
import { startOrbitBreak } from './orbit-game.js'

let cachedOrbit = null
let loadingOrbitConfig = null

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]))

function formatNumber(value) {
  return new Intl.NumberFormat('vi-VN').format(Number(value || 0))
}

async function getOrbitConfig() {
  if (cachedOrbit) return cachedOrbit
  if (!loadingOrbitConfig) {
    loadingOrbitConfig = api('bootstrap')
      .then((data) => {
        cachedOrbit = (data.games || []).find((game) => game.id === 'orbit-break' && game.enabled !== false) || null
        return cachedOrbit
      })
      .finally(() => { loadingOrbitConfig = null })
  }
  return loadingOrbitConfig
}

function updateVisibleBalance(data) {
  const button = document.querySelector('header .balance')
  if (!button || !data?.wallet) return
  button.innerHTML = `<span>G</span>${formatNumber(data.wallet.balance)} coin`
}

async function injectOrbitCard() {
  const games = document.querySelector('#view .games')
  if (!games || games.querySelector('#play-orbit') || games.dataset.orbitLoading === '1') return
  games.dataset.orbitLoading = '1'
  try {
    const orbit = await getOrbitConfig()
    if (!orbit || !document.body.contains(games) || games.querySelector('#play-orbit')) return

    const card = document.createElement('article')
    card.className = 'card game orbit-card'
    card.innerHTML = `
      <div class="gi orbit-gi">◉</div>
      <div>
        <strong>${escapeHtml(orbit.name || 'ORBIT BREAK')}</strong>
        <small>${escapeHtml(orbit.description || 'Bấm đúng nhịp để chuyển quỹ đạo.')}</small>
        <em>+10 điểm/lần đúng · 100 điểm = 10 coin</em>
        <span class="block-badge">ORBIT BREAK</span>
      </div>
      <button id="play-orbit">Chơi</button>`
    games.append(card)

    card.querySelector('#play-orbit').onclick = () => startOrbitBreak({
      api,
      refresh: () => api('bootstrap'),
      onReward: ({ data }) => updateVisibleBalance(data),
    })
  } catch (error) {
    console.error('Không tải được cấu hình ORBIT BREAK', error)
  } finally {
    delete games.dataset.orbitLoading
  }
}

const style = document.createElement('style')
style.textContent = `
  .orbit-card{position:relative;overflow:hidden;background:linear-gradient(145deg,rgba(8,17,39,.98),rgba(18,12,42,.98))!important;border-color:rgba(98,246,255,.18)!important}
  .orbit-card:before{content:"";position:absolute;right:-42px;top:-58px;width:150px;height:150px;border-radius:50%;border:2px solid rgba(98,246,255,.13);box-shadow:0 0 40px rgba(255,69,207,.08);pointer-events:none}
  .orbit-card .orbit-gi{color:#72f7ff;text-shadow:0 0 18px rgba(98,246,255,.55);font-size:34px}
  .orbit-card em{color:#72f7ff!important}
`
document.head.append(style)

const observer = new MutationObserver(() => { injectOrbitCard() })
observer.observe(document.documentElement, { childList: true, subtree: true })
injectOrbitCard()
