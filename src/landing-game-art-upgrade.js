const GAME_ART = {
  planet: '/assets/games/galaxy-match.svg',
  fruit: '/assets/games/fruit-craze.svg',
  jewel: '/assets/games/jewel-quest.svg',
  candy: '/assets/games/candy-merge.svg',
  bubble: '/assets/games/bubble-pop.svg',
  zombie: '/assets/games/zombie-dash.svg',
  farm: '/assets/games/farm-puzzle.svg',
  runner: '/assets/games/speed-runner.svg',
  space: '/assets/games/pixel-shooter.svg',
  dragon: '/assets/games/dragon-merge.svg',
  spin: '/assets/games/lucky-spin.svg',
  town: '/assets/games/merge-town.svg',
}

function upgradeVirtualArt(root = document) {
  root.querySelectorAll?.('.gc-virtual-art').forEach((art) => {
    if (art.dataset.professionalArt === '1') return
    const key = Object.keys(GAME_ART).find((name) => art.classList.contains(`gc-art-${name}`))
    if (!key) return
    const img = document.createElement('img')
    img.src = `${GAME_ART[key]}?v=20260822-1345`
    img.alt = ''
    img.loading = 'lazy'
    img.decoding = 'async'
    img.draggable = false
    art.replaceChildren(img)
    art.dataset.professionalArt = '1'
  })
}

upgradeVirtualArt()

const root = document.querySelector('#app') || document.body
const observer = new MutationObserver(() => upgradeVirtualArt(root))
observer.observe(root, { childList: true, subtree: true })

window.setTimeout(() => {
  upgradeVirtualArt(root)
  observer.disconnect()
}, 15000)
