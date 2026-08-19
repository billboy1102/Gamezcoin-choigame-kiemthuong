const ORBIT_MESSAGE_PREFIX = 'gamezcoin-orbit'

const randomToken = () => {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
}

export function startOrbitBreak({ root, api, refresh, toast, onExit }) {
  const token = randomToken()
  const runs = new Map()
  let closed = false

  const base = new URL('./orbit-break/index.html', window.location.href)
  base.searchParams.set('gamezcoin', '1')
  base.searchParams.set('token', token)

  root.innerHTML = `
    <main class="orbit-host">
      <iframe id="orbit-frame" class="orbit-frame" title="ORBIT BREAK" src="${base.href}" allow="autoplay"></iframe>
      <button id="orbit-back" class="orbit-back" aria-label="Quay lại Gamezcoin">‹</button>
      <div id="orbit-reward" class="orbit-reward" aria-live="polite"></div>
    </main>
    <style>
      .orbit-host{position:fixed;inset:0;z-index:99999;background:#050711;overflow:hidden}
      .orbit-frame{position:absolute;inset:0;width:100%;height:100%;border:0;background:#050711}
      .orbit-back{position:absolute;left:max(12px,env(safe-area-inset-left));top:max(14px,env(safe-area-inset-top));z-index:5;width:46px;height:46px;border:1px solid rgba(255,255,255,.16);border-radius:50%;background:rgba(3,8,20,.58);backdrop-filter:blur(9px);color:#fff;font-size:34px;line-height:38px;padding:0;box-shadow:0 8px 28px rgba(0,0,0,.28)}
      .orbit-reward{position:absolute;left:50%;bottom:max(28px,calc(env(safe-area-inset-bottom) + 18px));z-index:6;transform:translate(-50%,18px);opacity:0;pointer-events:none;padding:11px 18px;border-radius:999px;background:rgba(4,13,25,.82);border:1px solid rgba(98,246,255,.28);color:#fff;font-weight:900;white-space:nowrap;transition:.22s ease;box-shadow:0 0 28px rgba(98,246,255,.14)}
      .orbit-reward.show{opacity:1;transform:translate(-50%,0)}
      .orbit-reward.bad{border-color:rgba(255,86,120,.38)}
    </style>`

  const reward = root.querySelector('#orbit-reward')
  const showReward = (text, bad = false) => {
    if (!reward) return
    reward.textContent = text
    reward.classList.toggle('bad', bad)
    reward.classList.add('show')
    clearTimeout(showReward.timer)
    showReward.timer = setTimeout(() => reward?.classList.remove('show'), 2600)
  }

  const cleanup = () => {
    if (closed) return
    closed = true
    window.removeEventListener('message', onMessage)
  }

  const onMessage = async (event) => {
    const msg = event.data
    if (!msg || msg.prefix !== ORBIT_MESSAGE_PREFIX || msg.token !== token || closed) return
    const runId = Number(msg.run_id)
    if (!Number.isSafeInteger(runId) || runId < 1) return

    if (msg.type === 'session-request') {
      if (!runs.has(runId)) {
        runs.set(runId, api('start_game', { game_id: 'orbit-break' }))
      }
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
        if (!Number.isSafeInteger(hits) || hits < 0 || displayScore !== hits * 10) throw new Error('INVALID_SCORE')
        const response = await api('finish_game', { session_id: started.session.id, score: hits })
        const coin = Number(response.result?.game_coin || 0)
        showReward(`+${coin.toLocaleString('vi-VN')} coin · ${displayScore.toLocaleString('vi-VN')} điểm`)
        toast?.(`ORBIT BREAK +${coin.toLocaleString('vi-VN')} coin`, 'ok')
        await refresh?.()
      } catch (error) {
        showReward('Không cộng được coin · chạm chơi lại', true)
        toast?.(error?.message || 'Không cộng được coin', 'bad')
      } finally {
        runs.delete(runId)
      }
    }
  }

  window.addEventListener('message', onMessage)
  root.querySelector('#orbit-back').onclick = () => {
    cleanup()
    onExit?.()
  }
}
