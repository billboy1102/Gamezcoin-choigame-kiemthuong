const LOCKED_VIEWPORT = 'width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover'
const GAME_SELECTOR = '.play-screen, .play-loading, .play-result, .orbit-host, #gm .bb-stage'

let locked = false
let savedScrollY = 0
let queued = false

const viewport = document.querySelector('meta[name="viewport"]')
const normalViewport = viewport?.getAttribute('content') || 'width=device-width, initial-scale=1, viewport-fit=cover'

const style = document.createElement('style')
style.dataset.gameViewportLock = '1'
style.textContent = `
html.gc-game-locked,
html.gc-game-locked body{
  width:100%!important;
  height:100%!important;
  max-width:100%!important;
  max-height:100%!important;
  overflow:hidden!important;
  overscroll-behavior:none!important;
  touch-action:none!important;
}
body.gc-game-locked{
  position:fixed!important;
  inset:0!important;
  margin:0!important;
  padding:0!important;
}
body.gc-game-locked .play-screen,
body.gc-game-locked .play-loading,
body.gc-game-locked .play-result,
body.gc-game-locked .orbit-host,
body.gc-game-locked #gm{
  width:100vw!important;
  height:100dvh!important;
  min-height:100dvh!important;
  max-height:100dvh!important;
  overflow:hidden!important;
  overscroll-behavior:none!important;
  touch-action:none!important;
}
body.gc-game-locked .play-screen *,
body.gc-game-locked .play-loading *,
body.gc-game-locked .play-result *,
body.gc-game-locked .orbit-host *,
body.gc-game-locked #gm *{
  -webkit-tap-highlight-color:transparent!important;
  -webkit-touch-callout:none!important;
  -webkit-user-select:none!important;
  user-select:none!important;
}
body.gc-game-locked img,
body.gc-game-locked svg,
body.gc-game-locked canvas,
body.gc-game-locked iframe{
  -webkit-user-drag:none!important;
  user-drag:none!important;
}
body.gc-game-locked .orbit-frame,
body.gc-game-locked .play-board,
body.gc-game-locked .play-piece{
  touch-action:none!important;
  overscroll-behavior:none!important;
}
`
document.head.append(style)

function setLocked(next) {
  if (next === locked) return
  locked = next

  if (locked) {
    savedScrollY = window.scrollY || document.documentElement.scrollTop || 0
    window.scrollTo(0, 0)
    document.documentElement.classList.add('gc-game-locked')
    document.body.classList.add('gc-game-locked')
    viewport?.setAttribute('content', LOCKED_VIEWPORT)
    return
  }

  document.documentElement.classList.remove('gc-game-locked')
  document.body.classList.remove('gc-game-locked')
  viewport?.setAttribute('content', normalViewport)
  requestAnimationFrame(() => window.scrollTo(0, savedScrollY))
}

function sync() {
  setLocked(Boolean(document.querySelector(GAME_SELECTOR)))
}

function schedule() {
  if (queued) return
  queued = true
  queueMicrotask(() => {
    queued = false
    sync()
  })
}

function stopBrowserGesture(event) {
  if (!locked) return
  event.preventDefault()
}

function stopMultiTouch(event) {
  if (!locked || !event.touches || event.touches.length < 2) return
  event.preventDefault()
}

;['gesturestart', 'gesturechange', 'gestureend'].forEach((type) => {
  document.addEventListener(type, stopBrowserGesture, { capture: true, passive: false })
})

document.addEventListener('touchstart', stopMultiTouch, { capture: true, passive: false })
document.addEventListener('touchmove', stopMultiTouch, { capture: true, passive: false })
document.addEventListener('dblclick', stopBrowserGesture, { capture: true, passive: false })
document.addEventListener('dragstart', stopBrowserGesture, { capture: true, passive: false })
document.addEventListener('selectstart', stopBrowserGesture, { capture: true, passive: false })

new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true })
window.addEventListener('pageshow', schedule)
window.addEventListener('pagehide', () => setLocked(false))
schedule()
