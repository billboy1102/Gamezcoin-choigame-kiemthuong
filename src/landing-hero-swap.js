const HERO_ART = '/assets/landing-hero-gaming.webp?v=20260821-1432'

const css = `
.gc-public-hero-meta{gap:10px!important}
.gc-public-hero-meta .gc-hero-proof{min-height:44px!important;padding:8px 12px!important;display:flex!important;align-items:center!important;gap:9px!important;border:1px solid rgba(53,98,152,.48)!important;border-radius:12px!important;background:rgba(4,22,43,.7)!important;color:#eef7ff!important}
.gc-public-hero-meta .gc-hero-proof .gc-proof-ico{width:20px!important;height:20px!important;display:grid!important;place-items:center!important;color:#41e5ff!important;font-size:17px!important;line-height:1!important;flex:0 0 20px!important}
.gc-public-hero-meta .gc-hero-proof b{font-size:10px!important;line-height:1.2!important;letter-spacing:.01em!important}
.gc-public-hero-art.gc-hero-art-replaced{right:0!important;top:2%!important;width:56%!important;height:96%!important;display:flex!important;align-items:center!important;justify-content:center!important;overflow:visible!important}
.gc-public-hero-art.gc-hero-art-replaced .gc-public-hero-exact{position:relative!important;inset:auto!important;display:block!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;object-fit:contain!important;object-position:center!important;background:transparent!important;border:0!important;border-radius:0!important;filter:drop-shadow(0 22px 28px rgba(0,0,0,.36))!important;transform:none!important}
@media(max-width:650px){
 .gc-public-hero-meta{grid-template-columns:repeat(3,1fr)!important;gap:6px!important}
 .gc-public-hero-meta .gc-hero-proof{min-height:58px!important;padding:7px 5px!important;display:grid!important;place-items:center!important;align-content:center!important;text-align:center!important;gap:3px!important}
 .gc-public-hero-meta .gc-hero-proof .gc-proof-ico{width:19px!important;height:19px!important;font-size:16px!important}
 .gc-public-hero-meta .gc-hero-proof b{font-size:9px!important;line-height:1.25!important}
 .gc-public-hero-art.gc-hero-art-replaced{left:0!important;right:0!important;top:auto!important;bottom:0!important;width:100%!important;height:340px!important;padding:0 8px!important}
 .gc-public-hero-art.gc-hero-art-replaced .gc-public-hero-exact{width:100%!important;height:100%!important;object-fit:contain!important;object-position:center bottom!important;filter:drop-shadow(0 15px 18px rgba(0,0,0,.34))!important}
}
`

function ensureStyle(){
  if(document.getElementById('gc-landing-hero-swap-style')) return
  const style=document.createElement('style')
  style.id='gc-landing-hero-swap-style'
  style.textContent=css
  document.head.append(style)
}

function applyHeroSwap(){
  const root=document.querySelector('.gc-public-home')
  if(!root || root.dataset.heroSwap==='1') return false
  root.dataset.heroSwap='1'

  const meta=root.querySelector('.gc-public-hero-meta')
  if(meta){
    meta.innerHTML=`
      <span class="gc-hero-proof"><i class="gc-proof-ico">⭐</i><b>4.8/5 Đánh giá</b></span>
      <span class="gc-hero-proof"><i class="gc-proof-ico">👥</i><b>100.000+ Người dùng thật</b></span>
      <span class="gc-hero-proof"><i class="gc-proof-ico">⚡</i><b>Thanh toán nhanh chóng</b></span>`
  }

  const art=root.querySelector('.gc-public-hero-art')
  if(art){
    art.classList.add('gc-hero-art-replaced')
    art.innerHTML=`<img class="gc-public-hero-exact" src="${HERO_ART}" alt="Gamezcoin - tay cầm, điện thoại, hộp quà và đồng G">`
  }
  return true
}

ensureStyle()
if(!applyHeroSwap()){
  const app=document.getElementById('app')
  if(app){
    const observer=new MutationObserver(()=>{
      if(applyHeroSwap()) observer.disconnect()
    })
    observer.observe(app,{childList:true,subtree:true})
    window.setTimeout(()=>observer.disconnect(),12000)
  }
}
