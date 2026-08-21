const SHOWCASE_SRC = './assets/gamezcoin-rewards-showcase.svg?v=20260821-2245'

const css = `
.gc-public-live-games{position:relative!important}
.gc-public-live-games::before{display:none!important;content:none!important}
.gc-inline-hero-art{display:none!important}
.gc-force-showcase{display:block!important;width:min(640px,calc(100% - 16px))!important;margin:0 auto 22px!important;position:relative!important;z-index:20!important;opacity:1!important;visibility:visible!important;transform:none!important}
.gc-force-showcase img{display:block!important;width:100%!important;height:auto!important;max-width:100%!important;min-height:1px!important;opacity:1!important;visibility:visible!important;object-fit:contain!important;border:0!important;border-radius:20px!important;background:#fff!important;filter:drop-shadow(0 18px 32px rgba(0,0,0,.28))!important}
@media(max-width:700px){
 .gc-force-showcase{width:calc(100vw - 24px)!important;margin:0 calc(50% - 50vw + 12px) 20px!important}
 .gc-force-showcase img{border-radius:16px!important}
 .gc-public-live-games{margin-top:24px!important;padding-top:0!important}
}
`

function ensureStyle(){
  if(document.getElementById('gc-force-showcase-style')) return
  const style=document.createElement('style')
  style.id='gc-force-showcase-style'
  style.textContent=css
  document.head.append(style)
}

function mountShowcase(){
  const section=document.querySelector('.gc-public-live-games')
  if(!section) return false
  let wrap=section.querySelector(':scope > .gc-force-showcase')
  if(!wrap){
    wrap=document.createElement('div')
    wrap.className='gc-force-showcase'
    const img=document.createElement('img')
    img.src=SHOWCASE_SRC
    img.alt='Gamezcoin - tay cầm chơi game, điện thoại, hộp quà và đồng G'
    img.decoding='async'
    img.loading='eager'
    img.fetchPriority='high'
    wrap.append(img)
    section.prepend(wrap)
  }
  return true
}

ensureStyle()
if(!mountShowcase()){
  const root=document.getElementById('app') || document.body
  const observer=new MutationObserver(()=>{
    if(mountShowcase()) observer.disconnect()
  })
  observer.observe(root,{childList:true,subtree:true})
  window.setTimeout(()=>observer.disconnect(),15000)
}

window.addEventListener('load',()=>mountShowcase(),{once:true})
