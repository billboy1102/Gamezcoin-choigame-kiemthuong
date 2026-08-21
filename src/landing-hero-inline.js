const HERO_SRC = '/assets/landing-hero-gaming.svg?v=20260821-2133'

const css = `
.gc-public-hero-art{display:none!important}
.gc-inline-hero-art{display:block;width:min(640px,100%);margin:24px auto 0;position:relative;z-index:2}
.gc-inline-hero-art img{display:block;width:100%;height:auto;max-width:100%;object-fit:contain;background:transparent;border:0;filter:drop-shadow(0 18px 28px rgba(0,0,0,.35))}
@media(max-width:650px){
 .gc-public-hero{min-height:auto!important;padding-bottom:34px!important}
 .gc-inline-hero-art{width:100%;margin:18px auto 0;padding:0 8px}
 .gc-inline-hero-art img{width:100%;height:auto;max-height:none!important;object-position:center}
}
`

function ensureStyle(){
  if(document.getElementById('gc-inline-hero-art-style')) return
  const style=document.createElement('style')
  style.id='gc-inline-hero-art-style'
  style.textContent=css
  document.head.append(style)
}

function mount(){
  const root=document.querySelector('.gc-public-home')
  if(!root) return false
  if(root.querySelector('.gc-inline-hero-art')) return true
  const meta=root.querySelector('.gc-public-hero-meta')
  if(!meta) return false
  const wrap=document.createElement('div')
  wrap.className='gc-inline-hero-art'
  const img=document.createElement('img')
  img.src=HERO_SRC
  img.alt='Gamezcoin - tay cầm, điện thoại, hộp quà và đồng G'
  img.decoding='async'
  wrap.append(img)
  meta.insertAdjacentElement('afterend',wrap)
  return true
}

ensureStyle()
if(!mount()){
  const app=document.getElementById('app')
  if(app){
    const observer=new MutationObserver(()=>{
      if(mount()) observer.disconnect()
    })
    observer.observe(app,{childList:true,subtree:true})
    window.setTimeout(()=>observer.disconnect(),12000)
  }
}
