const ORBIT_MESSAGE_PREFIX = 'gamezcoin-orbit'
const ORBIT_INDEX_URL = 'https://raw.githubusercontent.com/billboy1102/ORBIT-BREAK/main/index.html'
const ORBIT_BASE_URL = 'https://raw.githubusercontent.com/billboy1102/ORBIT-BREAK/main/game-base.html'
const ORBIT_SPLASH_URL = 'https://raw.githubusercontent.com/billboy1102/ORBIT-BREAK/main/assets/bobbey-game-studio-splash.jpg'

const randomToken = () => {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
}

async function fetchText(url) {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) throw new Error(`Không tải được ORBIT BREAK (${response.status})`)
  return response.text()
}

function patchOrbitSource(indexHtml, gameBaseHtml, token) {
  let html = indexHtml
  const settingsMarker = "let orbitSettings={vibration:true,language:'vi',volume:1};"
  const resetMarker = "reset=function(){\n  score=0;combo=1;bestCombo=1;hits=0;"
  const scoreMarker = 'score+=1;combo=1;'
  const finishMarker = "setTimeout(function(){state='over';high=Math.max(high,score);"
  const baseMarker = "frame.src='game-base.html';"

  if (!html.includes(settingsMarker) || !html.includes(resetMarker) || !html.includes(scoreMarker) || !html.includes(finishMarker) || !html.includes(baseMarker)) {
    throw new Error('Source ORBIT BREAK đã thay đổi, chưa thể gắn hệ thống coin an toàn.')
  }

  const safeToken = String(token).replace(/[^a-zA-Z0-9_-]/g, '')
  html = html.replace('assets/bobbey-game-studio-splash.jpg', ORBIT_SPLASH_URL)
  html = html.replace(
    settingsMarker,
    `${settingsMarker}\nconst GAMEZCOIN_MODE=true,GAMEZCOIN_TOKEN='${safeToken}';let gamezcoinRunId=0;`,
  )
  html = html.replace(
    resetMarker,
    "reset=function(){\n  gamezcoinRunId++;window.top.postMessage({prefix:'gamezcoin-orbit',type:'session-request',token:GAMEZCOIN_TOKEN,run_id:gamezcoinRunId},'*');\n  score=0;combo=1;bestCombo=1;hits=0;",
  )
  html = html.replace(scoreMarker, 'score+=10;combo=1;')
  html = html.replace(
    finishMarker,
    "setTimeout(function(){window.top.postMessage({prefix:'gamezcoin-orbit',type:'finish',token:GAMEZCOIN_TOKEN,run_id:gamezcoinRunId,score:score,hits:hits},'*');state='over';high=Math.max(high,score);",
  )

  // game-base must stay same-origin so ORBIT's own patchGame() can read and patch it.
  // Embedding it as srcdoc preserves the exact source while also working in Capacitor APK/AAB.
  const baseLiteral = JSON.stringify(gameBaseHtml).replace(/<\/script/gi, '<\\/script')
  html = html.replace(baseMarker, `frame.srcdoc=${baseLiteral};`)
  return html
}

function makeOverlay() {
  const host = document.createElement('main')
  host.className = 'orbit-host'
  host.innerHTML = `
    <iframe class="orbit-frame" title="ORBIT BREAK" allow="autoplay"></iframe>
    <button class="orbit-back" aria-label="Quay lại Gamezcoin">‹</button>
    <div class="orbit-loader"><div></div><p>Đang tải ORBIT BREAK...</p></div>
    <div class="orbit-reward" aria-live="polite"></div>
    <style>
      .orbit-host{position:fixed;inset:0;z-index:99999;background:#050711;overflow:hidden}
      .orbit-frame{position:absolute;inset:0;width:100%;height:100%;border:0;background:#050711;opacity:0;transition:opacity .16s ease}
      .orbit-frame.ready{opacity:1}
      .orbit-back{position:absolute;left:max(12px,env(safe-area-inset-left));top:max(14px,env(safe-area-inset-top));z-index:8;width:46px;height:46px;border:1px solid rgba(255,255,255,.16);border-radius:50%;background:rgba(3,8,20,.58);backdrop-filter:blur(9px);color:#fff;font-size:34px;line-height:38px;padding:0;box-shadow:0 8px 28px rgba(0,0,0,.28)}
      .orbit-loader{position:absolute;inset:0;z-index:7;display:grid;place-content:center;text-align:center;color:#dcecff;font-family:system-ui;background:#050711;transition:opacity .18s ease}
      .orbit-loader.hide{opacity:0;pointer-events:none}
      .orbit-loader div{width:34px;height:34px;margin:auto;border:3px solid #ffffff22;border-top-color:#62f6ff;border-radius:50%;animation:orbitSpin .8s linear infinite}
      .orbit-loader p{margin:12px 0 0;font-size:13px;letter-spacing:.4px;color:#9db4cc}
      @keyframes orbitSpin{to{transform:rotate(360deg)}}
      .orbit-reward{position:absolute;left:50%;bottom:max(28px,calc(env(safe-area-inset-bottom) + 18px));z-index:9;transform:translate(-50%,18px);opacity:0;pointer-events:none;padding:11px 18px;border-radius:999px;background:rgba(4,13,25,.86);border:1px solid rgba(98,246,255,.34);color:#fff;font:900 14px/1.2 system-ui;white-space:nowrap;transition:.22s ease;box-shadow:0 0 28px rgba(98,246,255,.16)}
      .orbit-reward.show{opacity:1;transform:translate(-50%,0)}
      .orbit-reward.bad{border-color:rgba(255,86,120,.44)}
    </style>`
  document.body.append(host)
  return host
}

export async function startOrbitBreak({ api, refresh, onExit, onReward }) {
  const token = randomToken()
  const runs = new Map()
  const host = makeOverlay()
  const frame = host.querySelector('.orbit-frame')
  const loader = host.querySelector('.orbit-loader')
  const reward = host.querySelector('.orbit-reward')
  let closed = false

  const showReward = (text, bad = false) => {
    if (!reward || closed) return
    reward.textContent = text
    reward.classList.toggle('bad', bad)
    reward.classList.add('show')
    clearTimeout(showReward.timer)
    showReward.timer = setTimeout(() => reward?.classList.remove('show'), 3000)
  }

  const cleanup = () => {
    if (closed) return
    closed = true
    window.removeEventListener('message', onMessage)
    host.remove()
    onExit?.()
  }

  const onMessage = async (event) => {
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

  try {
    const [indexHtml, gameBaseHtml] = await Promise.all([
      fetchText(ORBIT_INDEX_URL),
      fetchText(ORBIT_BASE_URL),
    ])
    if (closed) return
    frame.srcdoc = patchOrbitSource(indexHtml, gameBaseHtml, token)
    frame.addEventListener('load', () => {
      if (closed) return
      frame.classList.add('ready')
      loader?.classList.add('hide')
    }, { once: true })
  } catch (error) {
    console.error('ORBIT BREAK load', error)
    if (loader) loader.innerHTML = `<p style="max-width:280px;color:#ff9cad">${String(error?.message || 'Không tải được ORBIT BREAK')}</p><button class="orbit-close-error" style="margin:14px auto 0;border:0;border-radius:12px;padding:11px 18px;font-weight:800">Quay lại</button>`
    host.querySelector('.orbit-close-error')?.addEventListener('click', cleanup)
  }
}
