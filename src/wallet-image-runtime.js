import './wallet-image-runtime.css'
import c0 from './assets/wallet-chunks/0.txt?raw'
import c1 from './assets/wallet-chunks/1.txt?raw'
import c2 from './assets/wallet-chunks/2.txt?raw'
import c3 from './assets/wallet-chunks/3.txt?raw'
import c4 from './assets/wallet-chunks/4.txt?raw'
import c5 from './assets/wallet-chunks/5.txt?raw'

const walletDataUrl = `data:image/webp;base64,${c0.trim()}${c1.trim()}${c2.trim()}${c3.trim()}${c4.trim()}${c5.trim()}`
let queued = false

function applyWalletImage() {
  document.querySelectorAll('.gc-premium-wallet-art').forEach((node) => {
    node.style.setProperty('background', 'transparent', 'important')
    node.style.setProperty('background-image', `url("${walletDataUrl}")`, 'important')
    node.style.setProperty('background-repeat', 'no-repeat', 'important')
    node.style.setProperty('background-position', 'center', 'important')
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
