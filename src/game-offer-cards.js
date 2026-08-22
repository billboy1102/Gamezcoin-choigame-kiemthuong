import './game-offer-cards.css'
import blockBanner from './assets/block-blast-banner.webp'
import orbitBanner from './assets/orbit-break-banner.webp'

const bannerByGame = {
  'block-blast': blockBanner,
  'orbit-break': orbitBanner
}

let queued = false

function enhanceCard(card) {
  if (!card || card.dataset.gcOfferCard === '1') return

  const playButton = card.querySelector(':scope > button[data-home-game]')
  if (!playButton) return

  const gameId = playButton.dataset.homeGame
  const bannerSrc = bannerByGame[gameId]
  if (!bannerSrc) return

  const info = Array.from(card.children).find((node) =>
    node.tagName === 'DIV' && !node.classList.contains('gi') && !node.classList.contains('gc-offer-banner')
  )

  card.dataset.gcOfferCard = '1'
  card.classList.add('gc-offer-card')
  if (info) info.classList.add('gc-offer-info')

  if (!card.querySelector(':scope > .gc-offer-banner')) {
    const banner = document.createElement('div')
    banner.className = 'gc-offer-banner'
    banner.innerHTML = `<img src="${bannerSrc}" alt="${gameId === 'block-blast' ? 'Block Blast' : 'ORBIT BREAK'}" loading="lazy" decoding="async">`
    card.insertBefore(banner, card.firstChild)
  }

  playButton.textContent = 'Chơi và Kiếm Tiền'
  playButton.setAttribute('aria-label', `Chơi và Kiếm Tiền - ${gameId === 'block-blast' ? 'Block Blast' : 'ORBIT BREAK'}`)
}

function syncOfferCards() {
  document.querySelectorAll('.home-game-card').forEach(enhanceCard)
}

function schedule() {
  if (queued) return
  queued = true
  queueMicrotask(() => {
    queued = false
    syncOfferCards()
  })
}

new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true })
window.addEventListener('pageshow', schedule)
schedule()
