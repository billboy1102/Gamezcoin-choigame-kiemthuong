import './wallet-image-runtime.css'

const walletHeroUrl = '/src/assets/wallet-hero.svg'
let queued = false

function applyWalletImage() {
  document.querySelectorAll('.gc-premium-wallet-art').forEach((node) => {
    node.style.setProperty('background', 'transparent', 'important')
    node.style.setProperty('background-image', `url("${walletHeroUrl}")`, 'important')
    node.style.setProperty('background-repeat', 'no-repeat', 'important')
    node.style.setProperty('background-position', 'center, center', 'important')
    node.style.setProperty('background-size', 'contain', 'important')
    node.style.setProperty('-webkit-mask-image', 'none', 'important')
    node.style.setProperty('mask-image', 'none', 'important')
    node.style.setProperty('border', '0', 'important')
    node.style.setProperty('box-shadow', 'none', 'important')
  })
}

function schedule() {
  if (queued) return
  queued = true
  queueMicrotask(() => {
    queued = false
    applyWalletImage()
  })
}

new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true })
window.addEventListener('pageshow', schedule)
schedule()
