const ORBIT_MESSAGE_PREFIX = 'gamezcoin-orbit'
const ORBIT_GAME_URL = 'https://billboy1102.github.io/ORBIT-BREAK/gamezcoin.html'

const randomToken = () => {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
}

function makeOverlay(token) {
  const url = new URL(ORBIT_GAME_URL)
  url.searchParams.set('token', token)
  url.searchParams.set('v', String(Date.now()))

  const host = document.createElement('main')
  host.className = 'orbit-host'
  host.innerHTML = `
    <iframe class="orbit-frame" title="ORBIT BREAK" allow="autoplay" src="${url.href}"></iframe>
    <button class="orbit-back" aria-label="Quay lại Gamezcoin">‹</button>
    <div class="orbit-loader"><div></div><p>Đang mở ORBIT BREAK...</p></div>
    <div class="orbit-reward" aria-live="polite"></div>
    <style>
      .orbit-host{position:fixed;inset:0;z-index:99999;background:#050711;overflow:hidden}
      .orbit-frame{position:absolute;inset:0;width:100%;height:100%;border:0;background:#050711;opacity:0;transition:opacity .18s ease}
      .orbit-frame.ready{opacity:1}
      .orbit-back{position:absolute;left:max(12px,env(safe-area-inset-left));top:max(14px,env(safe-area-inset-top));z-index:8;width:46px;height:46px;border:1px solid rgba(255,255,255,.16);border-radius:50%;background:rgba(3,8,20,.62);backdrop-filter:blur(9px);color:#fff;font-size:34px;line-height:38px;padding:0;box-shadow:0 8px 28px rgba(0,0,0,.28)}
      .orbit-loader{position:absolute;inset:0;z-index:7;display:grid;place-content:center;text-align:center;color:#dcecff;font-family:system-ui;background:#050711;transition:opacity .18s ease}
      .orbit-loader.hide{opacity:0;pointer-events:none}
      .orbit-loader div{width:36px;height:36px;margin:auto;border:3px solid #ffffff22;border-top-color:#62f6ff;border-radius:50%;animation:orbitSpin .8s linear infinite}
      .orbit-loader p{margin:12px 0 0;font-size:13px;letter-spacing:.4px;color:#9db4cc}
      @keyframes orbitSpin{to{transform:rotate(360deg)}}
      .orbit-reward{position:absolute;left:50%;bottom:max(28px,calc(env(safe-area-inset-bottom) + 18px));z-index:9;transform:translate(-50%,18px);opacity:0;pointer-events:none;padding:11px 18px;border-radius:999px;background:rgba(4,13,25,.88);border:1px solid rgba(98,246,255,.34);color:#fff;font:900 14px/1.2 system-ui;white-space:nowrap;transition:.22s ease;box-shadow:0 0 28px rgba(98,246,255,.16)}
      .orbit-reward.show{opacity:1;transform:translate(-50%,0)}
      .orbit-reward.bad{border-color:rgba(255,86,120,.44)}
    </style>`
  document.body.append(host)
  return host
}

export function startOrbitBreak({ api, refresh, onExit, onReward }) {
  const token = randomToken()
  const runs = new Map()
  const host = makeOverlay(token)
  const frame = host.querySelector('.orbit-frame')
  const loader = host.querySelector('.orbit-loader')
  const reward = host.querySelector('.orbit-reward')
  let closed = false
  let loadTimer

  const showReward = (text, bad = false) => {
    if (!reward || closed) return
    reward.textContent = text
    reward.classList.toggle('bad', bad)
    reward.classList.add('show')
    clearTimeout(showReward.timer)
    showReward.timer = setTimeout(() => reward?.classList.remove('show'), 3200)
  }

  const cleanup = () => {
    if (closed) return
    closed = true
    clearTimeout(loadTimer)
    window.removeEventListener('message', onMessage)
    host.remove()
    onExit?.()
  }

  const onMessage = async (event) => {
    if (event.source !== frame.contentWindow) return
    const msg = event.data
    if (!msg || msg.prefix !== ORBIT_MESSAGE_PREFIX || msg.token !== token || closed) return
    const runId = Number(msg.run_id)
    if (!Number.isSafeInteger(runId) || runId < 1) return

    if (msg.type === 'session-request') {
      if (!runs.has(runId)) runs.set(runId, api('start_game', { game_id: 'orbit-break' }))
      return
    }

    if (msg.type === 'finish') {
      try {
        let sessionPromise = runs.get(runId)
        if (!sessionPromise) {
          sessionPromise = api('start_game', { game_id: 'orbit-break' })
          runs.set(runId, sessionPromise)
        }
        const started = await sessionPromise
        const hits = Number(msg.hits)
        const displayScore = Number(msg.score)
        if (!Number.isSafeInteger(hits) || hits < 0 || !Number.isSafeInteger(displayScore) || displayScore !== hits * 10) {
          throw new Error('INVALID_SCORE')
        }
        const response = await api('finish_game', { session_id: started.session.id, score: hits })
        const coin = Number(response.result?.game_coin || 0)
        showReward(`+${coin.toLocaleString('vi-VN')} coin · ${displayScore.toLocaleString('vi-VN')} điểm`)
        const fresh = await refresh?.()
        onReward?.({ coin, score: displayScore, data: fresh })
      } catch (error) {
        console.error('ORBIT BREAK reward', error)
        showReward('Không cộng được coin · chơi lại để thử lại', true)
      } finally {
        runs.delete(runId)
      }
    }
  }

  window.addEventListener('message', onMessage)
  host.querySelector('.orbit-back').onclick = cleanup

  frame.addEventListener('load', () => {
    if (closed) return
    clearTimeout(loadTimer)
    frame.classList.add('ready')
    loader?.classList.add('hide')
  }, { once: true })

  loadTimer = setTimeout(() => {
    if (closed || frame.classList.contains('ready')) return
    if (loader) loader.innerHTML = '<p style="max-width:280px;color:#ff9cad">ORBIT BREAK tải quá lâu. Hãy quay lại và thử lại.</p>'
  }, 12000)
}
