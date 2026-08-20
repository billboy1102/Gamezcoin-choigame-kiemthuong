let queued = false

function syncHooks() {
  document.querySelectorAll('.gc-rewards-catalog [data-launch-game]').forEach((button) => {
    const gameId = button.dataset.launchGame
    if (gameId && button.dataset.homeGame !== gameId) button.dataset.homeGame = gameId
  })
}

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
