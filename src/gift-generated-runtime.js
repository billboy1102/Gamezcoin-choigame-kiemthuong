import c1 from './assets/gift-generated-1.js'
import c2 from './assets/gift-generated-2.js'
import c3 from './assets/gift-generated-3.js'
import c4 from './assets/gift-generated-4.js'

const giftImage = `url("data:image/webp;base64,${c1}${c2}${c3}${c4}")`
let queued = false

function applyGiftImage() {
  document.querySelectorAll('.gc-premium-gift-art').forEach((node) => {
    node.style.setProperty('background-image', giftImage, 'important')
    node.style.setProperty('background-repeat', 'no-repeat', 'important')
    node.style.setProperty('background-position', 'right center', 'important')
    node.style.setProperty('background-size', 'contain', 'important')
    node.style.setProperty('-webkit-mask-image', 'none', 'important')
    node.style.setProperty('mask-image', 'none', 'important')
  })
}

function schedule() {
  if (queued) return
  queued = true
  queueMicrotask(() => {
    queued = false
    applyGiftImage()
  })
}

new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true })
window.addEventListener('pageshow', schedule)
schedule()
