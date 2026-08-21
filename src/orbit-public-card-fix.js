import orbitLogo from './assets/orbit-break-logo-real.jpg'

function applyOrbitPublicCardFix() {
  document.querySelectorAll('.gc-public-live-games .gc-live-card').forEach((card) => {
    const title = card.querySelector('h3')?.textContent?.trim() || ''
    if (!/orbit\s*break/i.test(title)) return

    const holder = card.querySelector('.gc-live-art')
    if (!holder) return

    holder.classList.add('gc-orbit-live-art-fixed')

    let img = holder.querySelector('img[data-gc-orbit-public-logo="1"]')
    if (!img) {
      img = document.createElement('img')
      img.dataset.gcOrbitPublicLogo = '1'
      img.alt = 'Orbit Break'
      holder.replaceChildren(img)
    }

    if (img.src !== orbitLogo) img.src = orbitLogo
  })
}

const style = document.createElement('style')
style.textContent = `
.gc-orbit-live-art-fixed{
  position:relative!important;
  min-height:130px!important;
  border:1px solid rgba(69,112,174,.68)!important;
  background:linear-gradient(145deg,#0b1b34,#071225)!important;
  overflow:hidden!important;
}
.gc-orbit-live-art-fixed img{
  display:block!important;
  width:100%!important;
  height:100%!important;
  min-height:130px!important;
  object-fit:cover!important;
  border:0!important;
}
@media(min-width:651px){
  .gc-orbit-live-art-fixed,.gc-orbit-live-art-fixed img{min-height:190px!important}
}
`
document.head.append(style)

let queued = false
function scheduleOrbitPublicCardFix() {
  if (queued) return
  queued = true
  queueMicrotask(() => {
    queued = false
    applyOrbitPublicCardFix()
  })
}

new MutationObserver(scheduleOrbitPublicCardFix).observe(document.documentElement, { childList: true, subtree: true })
window.addEventListener('pageshow', scheduleOrbitPublicCardFix)
scheduleOrbitPublicCardFix()
