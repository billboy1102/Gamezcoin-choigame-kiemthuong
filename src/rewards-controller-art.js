import './rewards-controller-art.css'
import controllerArt from './assets/rewards-controller-coins.webp'

let queued = false

function syncRewardHeroArt() {
  const heroArt = document.querySelector('.gc-rewards-catalog .gc-reward-hero-art')
  if (!heroArt) return

  heroArt.classList.add('gc-controller-art-ready')
  heroArt.querySelectorAll('.gc-floating-pad,.gc-floating-app,.gc-hero-coin').forEach((node) => {
    node.style.display = 'none'
  })

  const image = heroArt.querySelector('img')
  if (!image) return

  image.alt = ''
  image.classList.add('gc-reward-controller-coins-art')

  const show = () => {
    image.hidden = false
    image.style.visibility = 'visible'
    heroArt.classList.remove('gc-controller-art-failed')
  }
  const fail = () => {
    image.hidden = true
    heroArt.classList.add('gc-controller-art-failed')
  }

  image.onload = show
  image.onerror = fail

  if (image.getAttribute('src') !== controllerArt) {
    image.hidden = false
    image.style.visibility = 'hidden'
    image.setAttribute('src', controllerArt)
  }

  if (image.complete) {
    if (image.naturalWidth > 0) show()
    else fail()
  }
}

function schedule() {
  if (queued) return
  queued = true
  queueMicrotask(() => {
    queued = false
    syncRewardHeroArt()
  })
}

new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true })
window.addEventListener('pageshow', schedule)
schedule()
