const SHOWCASE_SRC='/assets/gamezcoin-rewards-user.svg?v=20260822-0100'

const css=`
.gc-public-live-games::before{display:none!important;content:none!important}
.gc-inline-hero-art{display:none!important}
.gc-force-showcase{display:block!important;width:min(640px,calc(100% - 24px))!important;aspect-ratio:1/1!important;margin:0 auto 22px!important;position:relative!important;z-index:20!important;overflow:hidden!important;background:transparent!important}
.gc-force-showcase object{display:block!important;width:100%!important;height:100%!important;border:0!important;background:transparent!important;pointer-events:none!important}
@media(max-width:700px){.gc-force-showcase{width:min(390px,calc(100vw - 24px))!important;margin:0 auto 18px!important}}
`

function ensureStyle(){
 let style=document.getElementById('gc-force-showcase-style')
 if(!style){style=document.createElement('style');style.id='gc-force-showcase-style';document.head.appendChild(style)}
 style.textContent=css
}

function mountShowcase(){
 ensureStyle()
 const section=document.querySelector('.gc-public-live-games')
 if(!section)return false
 let wrap=section.querySelector('.gc-force-showcase')
 if(!wrap){wrap=document.createElement('div');wrap.className='gc-force-showcase';section.insertBefore(wrap,section.firstChild)}
 let art=wrap.querySelector('object')
 if(!art){
   art=document.createElement('object')
   art.type='image/svg+xml'
   art.setAttribute('aria-label','Gamezcoin rewards artwork')
   wrap.replaceChildren(art)
 }
 if(art.getAttribute('data')!==SHOWCASE_SRC)art.setAttribute('data',SHOWCASE_SRC)
 return true
}

ensureStyle()
if(!mountShowcase()){
 const root=document.getElementById('app')||document.body
 const observer=new MutationObserver(()=>{if(mountShowcase())observer.disconnect()})
 observer.observe(root,{childList:true,subtree:true})
 window.setTimeout(()=>observer.disconnect(),12000)
}
