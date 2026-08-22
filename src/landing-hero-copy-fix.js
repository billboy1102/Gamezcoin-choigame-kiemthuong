function setText(node, value) {
  if (node && node.textContent !== value) node.textContent = value
}

function applyLandingHeroCopy(root = document) {
  const hero = root.querySelector?.('.gc-public-hero')
  if (!hero) return false

  const eyebrow = hero.querySelector('.gc-public-eyebrow')
  const eyebrowHtml = '<i></i> GAMEZCOIN · Chơi game & Kiếm Tiền'
  if (eyebrow && eyebrow.innerHTML !== eyebrowHtml) eyebrow.innerHTML = eyebrowHtml

  const title = hero.querySelector('h1')
  const titleHtml = 'Chơi game & <em>kiếm tiền</em>'
  if (title && title.innerHTML !== titleHtml) title.innerHTML = titleHtml

  const description = hero.querySelector('.gc-public-hero-copy > p')
  setText(description, 'Chơi game, kiếm tiền thật và rút thưởng uy tín, nhanh chóng về ví của bạn')

  const primary = hero.querySelector('.gc-public-hero-cta .gc-hero-explore')
  if (primary) {
    const arrow = primary.querySelector('svg')?.outerHTML || ''
    const nextHtml = `Bắt đầu kiếm tiền ${arrow}`.trim()
    if (primary.innerHTML !== nextHtml) primary.innerHTML = nextHtml
  }

  const secondary = hero.querySelector('.gc-public-hero-cta .secondary')
  if (secondary) {
    secondary.dataset.publicAuth = 'login'
    setText(secondary, 'Đăng nhập')
  }

  const meta = hero.querySelectorAll('.gc-public-hero-meta > span')
  const metrics = [
    '⭐️ 4.8/5 Đánh giá',
    '👥 100.000+ Người dùng thật',
    '⚡ Thanh toán nhanh chóng',
  ]
  meta.forEach((item, index) => {
    const value = metrics[index]
    if (!value) return
    const nextHtml = `<b>${value}</b>`
    if (item.innerHTML !== nextHtml) item.innerHTML = nextHtml
  })

  const sticky = root.querySelector?.('.gc-mobile-sticky-cta span')
  setText(sticky, 'Bắt đầu kiếm tiền')

  return true
}

let queued = false
function scheduleLandingHeroCopy() {
  if (queued) return
  queued = true
  queueMicrotask(() => {
    queued = false
    applyLandingHeroCopy(document)
  })
}

applyLandingHeroCopy(document)
const target = document.querySelector('#app') || document.documentElement
new MutationObserver(scheduleLandingHeroCopy).observe(target, { childList: true, subtree: true })
window.addEventListener('pageshow', scheduleLandingHeroCopy)
