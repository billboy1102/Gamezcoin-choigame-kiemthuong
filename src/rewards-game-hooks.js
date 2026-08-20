let blockBridge = null
let orbitBridgeHost = null
let orbitTimer = null

function hiddenStyle(node) {
  node.setAttribute('aria-hidden', 'true')
  node.style.cssText = 'position:fixed!important;left:-9999px!important;top:-9999px!important;width:1px!important;height:1px!important;overflow:hidden!important;opacity:0!important;pointer-events:none!important'
  return node
}

function getBlockBridge() {
  if (blockBridge?.isConnected) return blockBridge

  blockBridge = hiddenStyle(document.createElement('button'))
  blockBridge.type = 'button'
  blockBridge.id = 'play-block'
  blockBridge.dataset.play = 'block-blast'
  blockBridge.tabIndex = -1
  document.body.append(blockBridge)
  return blockBridge
}

function ensureOrbitBridgeHost() {
  if (orbitBridgeHost?.isConnected) return orbitBridgeHost

  const view = document.querySelector('#view')
  if (!view) return null

  orbitBridgeHost = hiddenStyle(document.createElement('div'))
  orbitBridgeHost.className = 'games gc-rewards-engine-bridges'
  view.append(orbitBridgeHost)
  return orbitBridgeHost
}

function openBlockIntro() {
  // block-intro.js is loaded before block-blast.js. The first click is therefore
  // intercepted by the intro; its “Bắt đầu chơi” click carries the bypass flag
  // and then reaches block-blast.js on this same bridge.
  getBlockBridge().click()
}

function openOrbitIntro() {
  ensureOrbitBridgeHost()
  clearInterval(orbitTimer)

  let tries = 0
  orbitTimer = setInterval(() => {
    tries += 1
    const button = orbitBridgeHost?.querySelector('#play-orbit')
    if (button) {
      clearInterval(orbitTimer)
      button.click()
      return
    }
    if (tries > 50) clearInterval(orbitTimer)
  }, 60)
}

// Capture before rewards-catalog.js own handler so the catalog never performs
// its old Home round-trip. Launch through the existing game intro/engine hooks.
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

  // Keep the hidden Orbit host alive while Rewards is mounted so orbit-inject.js
  // can insert its already-tested #play-orbit bridge and intro handler.
  if (document.querySelector('.gc-rewards-catalog')) ensureOrbitBridgeHost()
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
