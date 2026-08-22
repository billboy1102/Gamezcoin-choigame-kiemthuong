function setText(node, value) {
  if (node && node.textContent !== value) node.textContent = value
}

function applyLandingHeroCopy(root = document) {
  const hero = root.querySelector?.('.gc-public-hero')
  if (!hero) return false

  const eyebrow = hero.querySelector('.gc-public-eyebrow')
  if (eyebrow) {
    eyebrow.replaceChildren()
    const dot = document.createElement('i')
    eyebrow.append(dot, document.createTextNode(' GAMEZCOIN · Chơi game & Kiếm Tiền'))
  }

  const title = hero.querySelector('h1')
  if (title) {
    title.replaceChildren(document.createTextNode('Chơi game & '))
    const em = document.createElement('em')
    em.textContent = 'kiếm tiền'
    title.append(em)
  }

  setText(hero.querySelector('.gc-public-hero-copy > p'), 'Chơi game, kiếm tiền thật và rút thưởng uy tín, nhanh chóng về ví của bạn')

  const primary = hero.querySelector('.gc-public-hero-cta .gc-hero-explore')
  if (primary) {
    const svg = primary.querySelector('svg')?.cloneNode(true)
    primary.replaceChildren(document.createTextNode('Bắt đầu kiếm tiền '))
    if (svg) primary.append(svg)
  }

  const secondary = hero.querySelector('.gc-public-hero-cta .secondary')
  if (secondary) {
    secondary.dataset.publicAuth = 'login'
    setText(secondary, 'Đăng nhập')
  }

  const metrics = [
    '⭐️ 4.8/5 Đánh giá',
    '👥 100.000+ Người dùng thật',
    '⚡ Thanh toán nhanh chóng',
  ]
  hero.querySelectorAll('.gc-public-hero-meta > span').forEach((item, index) => {
    const value = metrics[index]
    if (!value) return
    item.replaceChildren()
    const strong = document.createElement('b')
    strong.textContent = value
    item.append(strong)
  })

  setText(root.querySelector?.('.gc-mobile-sticky-cta span'), 'Bắt đầu kiếm tiền')
  return true
}

function bootLandingHeroCopy() {
  if (applyLandingHeroCopy(document)) return

  const target = document.querySelector('#app') || document.documentElement
  const observer = new MutationObserver(() => {
    if (!document.querySelector('.gc-public-hero')) return
    observer.disconnect()
    applyLandingHeroCopy(document)
  })
  observer.observe(target, { childList: true, subtree: true })
  window.setTimeout(() => observer.disconnect(), 12000)
}

bootLandingHeroCopy()
window.addEventListener('pageshow', () => applyLandingHeroCopy(document))
