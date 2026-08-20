import './block-blast.js'
import { api } from './api.js'
import { startOrbitBreak } from './orbit-game.js'

let blockBridge = null

function formatNumber(value) {
  return new Intl.NumberFormat('vi-VN').format(Number(value || 0))
}

function updateVisibleBalance(data) {
  const balance = Number(data?.wallet?.balance || 0)
  const premium = document.querySelector('.gc-premium-head-balance strong')
  if (premium) premium.textContent = formatNumber(balance)

  const legacy = document.querySelector('.shell>header .balance')
  if (legacy && !premium) legacy.innerHTML = `<span>G</span>${formatNumber(balance)} coin`
}

function getBlockBridge() {
  if (blockBridge?.isConnected) return blockBridge

  blockBridge = document.createElement('button')
  blockBridge.type = 'button'
  blockBridge.id = 'play-block'
  blockBridge.dataset.play = 'block-blast'
  blockBridge.setAttribute('aria-hidden', 'true')
  blockBridge.tabIndex = -1
  blockBridge.style.cssText = 'position:fixed!important;left:-9999px!important;top:-9999px!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important'
  document.body.append(blockBridge)
  return blockBridge
}

function openBlockIntro() {
  // block-intro.js intercepts #play-block first. When the user presses
  // “Bắt đầu chơi”, it clicks this bridge again with bypass enabled and
  // block-blast.js receives the same click through data-play="block-blast".
  getBlockBridge().click()
}

function openOrbitIntro() {
  if (document.querySelector('.orbit-intro') || document.querySelector('.orbit-host')) return

  const intro = document.createElement('main')
  intro.className = 'orbit-intro'
  intro.innerHTML = `
    <section class="orbit-intro-shell">
      <header class="orbit-intro-head">
        <button class="orbit-intro-back" aria-label="Quay lại">‹</button>
        <div><small>MINI GAME</small><strong>ORBIT BREAK</strong></div>
        <span class="orbit-intro-chip">◉</span>
      </header>

      <div class="orbit-demo" aria-hidden="true">
        <div class="orbit-demo-ring"></div>
        <div class="orbit-demo-target"></div>
        <div class="orbit-demo-core"></div>
        <div class="orbit-demo-dot"></div>
        <div class="orbit-demo-copy"><b>CHẠM ĐÚNG NHỊP</b><span>Giữ quỹ đạo sống càng lâu càng tốt</span></div>
      </div>

      <section class="orbit-intro-card orbit-summary">
        <h2>ORBIT BREAK là gì?</h2>
        <p>Bấm đúng nhịp để chuyển quỹ đạo và cố gắng duy trì ván chơi càng lâu càng tốt.</p>
        <div class="orbit-reward-grid">
          <div><small>MỖI LẦN ĐÚNG</small><b>+10 điểm</b></div>
          <div><small>QUY ĐỔI</small><b>10 điểm = 1 coin</b></div>
        </div>
      </section>

      <section class="orbit-intro-card">
        <h2>Hướng dẫn chơi</h2>
        <ol class="orbit-steps">
          <li><i>1</i><div><b>Quan sát quả cầu đang xoay</b><span>Quả cầu chạy quanh tâm theo quỹ đạo neon.</span></div></li>
          <li><i>2</i><div><b>Chạm khi quả cầu tới vùng mục tiêu</b><span>Chạm đúng thời điểm để chuyển sang quỹ đạo tiếp theo.</span></div></li>
          <li><i>3</i><div><b>Mỗi lần đúng nhận điểm</b><span>Điểm hợp lệ được quy đổi thành coin sau khi server xác minh.</span></div></li>
          <li><i>4</i><div><b>Tốc độ tăng dần</b><span>Càng chơi lâu, nhịp càng nhanh và thời điểm bấm càng khó.</span></div></li>
          <li><i>5</i><div><b>Bấm sai là Game Over</b><span>Kết quả cuối ván được gửi lên server trước khi cộng coin.</span></div></li>
        </ol>
      </section>

      <section class="orbit-intro-card orbit-note">
        <b>💡 Mẹo</b>
        <p>Tập trung vào vùng mục tiêu và nhịp chuyển động của quả cầu. Âm thanh giúp canh nhịp chính xác hơn.</p>
      </section>

      <div class="orbit-intro-actions">
        <button class="orbit-start-button">▶ Bắt đầu chơi</button>
        <small>Điểm và coin chỉ được ghi khi server xác minh ván chơi.</small>
      </div>
    </section>`

  const close = () => {
    intro.remove()
    document.body.style.overflow = ''
  }

  intro.querySelector('.orbit-intro-back').onclick = close
  intro.querySelector('.orbit-start-button').onclick = () => {
    close()
    startOrbitBreak({
      api,
      refresh: () => api('bootstrap'),
      onReward: ({ data }) => updateVisibleBalance(data)
    })
  }

  document.body.append(intro)
  document.body.style.overflow = 'hidden'
}

// Capture before rewards-catalog.js own click handler. The old handler tried to
// jump back to Home and find legacy buttons that no longer exist after Home was
// cleaned up, which is why neither intro nor game opened.
document.addEventListener('click', (event) => {
  const button = event.target?.closest?.('.gc-rewards-catalog [data-launch-game]')
  if (!button) return

  const gameId = button.dataset.launchGame
  if (gameId !== 'block-blast' && gameId !== 'orbit-break') return

  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()

  if (gameId === 'block-blast') openBlockIntro()
  else openOrbitIntro()
}, true)

function syncHooks() {
  document.querySelectorAll('.gc-rewards-catalog [data-launch-game]').forEach((button) => {
    const gameId = button.dataset.launchGame
    if (gameId && button.dataset.homeGame !== gameId) button.dataset.homeGame = gameId
  })
}

let queued = false
function schedule() {
  if (queued) return
  queued = true
  queueMicrotask(() => {
    queued = false
    syncHooks()
  })
}

new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true })
window.addEventListener('pageshow', schedule)
schedule()
