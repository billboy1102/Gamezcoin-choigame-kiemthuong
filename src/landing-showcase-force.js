const SHOWCASE_SRC = '/assets/gamezcoin-rewards-user.svg?v=20260821-2305'

const css = `
.gc-public-live-games{position:relative!important}
.gc-public-live-games::before{display:none!important;content:none!important}
.gc-inline-hero-art{display:none!important}
.gc-force-showcase{display:block!important;width:min(640px,calc(100% - 16px))!important;margin:0 auto 22px!important;position:relative!important;z-index:20!important;opacity:1!important;visibility:visible!important;transform:none!important}
.gc-force-showcase img{display:block!important;width:100%!important;height:auto!important;max-width:100%!important;opacity:1!important;visibility:visible!important;object-fit:contain!important;border:0!important;background:transparent!important;filter:drop-shadow(0 18px 32px rgba(0,0,0,.28))!important}
@media(max-width:700px){
 .gc-force-showcase{width:calc(100vw - 24px)!important;margin:0 calc(50% - 50vw + 12px) 20px!important}
 .gc-public-live-games{margin-top:24px!important;padding-top:0!important}
}
`

function ensureStyle(){
  let style=document.getElementById('gc-force-showcase-style')
  if(!style){
    style=document.createElement('style')
    style.id='gc-force-showcase-style'
    document.head.appendChild(style)
  }
  style.textContent=css
}

function mountShowcase(){
  const section=document.querySelector('.gc-public-live-games')
  if(!section) return false
  let wrap=section.querySelector('.gc-force-showcase')
  if(!wrap){
    wrap=document.createElement('div')
    wrap.className='gc-force-showcase'
    section.insertBefore(wrap,section.firstChild)
  }
  let img=wrap.querySelector('img')
  if(!img){
    wrap.innerHTML=''
    img=document.createElement('img')
    img.alt='Gamezcoin - tay cầm chơi game, điện thoại, hộp quà và đồng G'
    img.decoding='async'
    img.loading='eager'
    wrap.appendChild(img)
  }
  if(img.getAttribute('src')!==SHOWCASE_SRC) img.setAttribute('src',SHOWCASE_SRC)
  return true
}

function keepMounted(){
  ensureStyle()
  mountShowcase()
}

keepMounted()
const root=document.getElementById('app') || document.body
const observer=new MutationObserver(()=>requestAnimationFrame(keepMounted))
observer.observe(root,{childList:true,subtree:true})
window.addEventListener('load',keepMounted)
window.addEventListener('pageshow',keepMounted)
document.addEventListener('visibilitychange',()=>{if(!document.hidden) keepMounted()})
