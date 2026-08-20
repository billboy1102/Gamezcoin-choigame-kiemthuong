import controllerArt from './assets/rewards-controller-coins.webp'

let queued = false

function syncRewardHeroArt() {
  const heroArt = document.querySelector('.gc-rewards-catalog .gc-reward-hero-art')
  if (!heroArt) return

  heroArt.querySelectorAll('.gc-floating-pad,.gc-floating-app,.gc-hero-coin').forEach((node) => {
    node.style.display = 'none'
  })

  const image = heroArt.querySelector('img')
  if (!image) return
  if (image.getAttribute('src') !== controllerArt) image.setAttribute('src', controllerArt)
  image.alt = ''
  image.classList.add('gc-reward-controller-coins-art')
  image.style.objectFit = 'contain'
  image.style.objectPosition = 'center'
  image.style.width = '100%'
  image.style.height = '100%'
  image.style.maxWidth = '100%'
  image.style.maxHeight = '100%'
  image.style.right = '0'
  image.style.bottom = '0'
  image.style.borderRadius = '0'
  image.style.background = 'transparent'
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
