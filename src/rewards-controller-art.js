import './rewards-controller-art.css'

const controllerArt = '/assets/rewards-controller-exact.svg'

let queued = false

function syncRewardHeroArt() {
  const heroArt = document.querySelector('.gc-rewards-catalog .gc-reward-hero-art')
  if (!heroArt) return

  heroArt.querySelectorAll('.gc-floating-pad,.gc-floating-app,.gc-hero-coin').forEach((node) => {
    node.style.display = 'none'
  })

  const image = heroArt.querySelector('img')
  if (!image) return

  image.alt = ''
  image.classList.add('gc-reward-controller-coins-art')
  image.style.display = 'block'

  image.onload = () => {
    heroArt.classList.remove('gc-controller-art-failed')
    heroArt.classList.add('gc-controller-art-ready')
    image.style.display = 'block'
  }

  image.onerror = () => {
    heroArt.classList.remove('gc-controller-art-ready')
    heroArt.classList.add('gc-controller-art-failed')
    image.style.display = 'none'
  }

  if (image.getAttribute('src') !== controllerArt) {
    heroArt.classList.remove('gc-controller-art-failed')
    image.setAttribute('src', controllerArt)
  } else if (image.complete && image.naturalWidth > 0) {
    heroArt.classList.add('gc-controller-art-ready')
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
