function lockOrbitLogo() {
  document.querySelectorAll('.gi[data-gc-game-icon="orbit-inline-logo"]').forEach((holder) => {
    holder.dataset.gcGameIcon = 'orbit-logo'
  })
}

let queued = false
function scheduleOrbitLogoLock() {
  if (queued) return
  queued = true
  queueMicrotask(() => {
    queued = false
    lockOrbitLogo()
  })
}

new MutationObserver(scheduleOrbitLogoLock).observe(document.documentElement, { childList: true, subtree: true })
window.addEventListener('pageshow', scheduleOrbitLogoLock)
scheduleOrbitLogoLock()
