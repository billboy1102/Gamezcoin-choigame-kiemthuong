const SHOWCASE_SRC='/assets/gamezcoin-rewards-exact.png?v=20260822-0035'

const css=`
.gc-public-live-games{position:relative!important}
.gc-public-live-games::before{display:none!important;content:none!important}
.gc-inline-hero-art{display:none!important}
.gc-force-showcase{display:block!important;width:min(640px,calc(100% - 24px))!important;aspect-ratio:1/1!important;margin:0 auto 22px!important;position:relative!important;z-index:20!important;background-image:url("${SHOWCASE_SRC}")!important;background-position:center!important;background-repeat:no-repeat!important;background-size:contain!important;border:0!important}
.gc-force-showcase img{display:none!important}
@media(max-width:700px){.gc-force-showcase{width:min(390px,calc(100vw - 24px))!important;margin:0 auto 18px!important}.gc-public-live-games{margin-top:24px!important;padding-top:0!important}}
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
 document.querySelectorAll('.gc-force-showcase').forEach((node,index)=>{if(index>0)node.remove()})
 let wrap=section.querySelector('.gc-force-showcase')
 if(!wrap){wrap=document.createElement('div');wrap.className='gc-force-showcase';wrap.setAttribute('role','img');wrap.setAttribute('aria-label','Gamezcoin rewards artwork');section.insertBefore(wrap,section.firstChild)}
 wrap.replaceChildren()
 return true
}

let scheduled=false
function keepMounted(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;mountShowcase()})}
ensureStyle();mountShowcase()
const root=document.getElementById('app')||document.body
new MutationObserver(keepMounted).observe(root,{childList:true,subtree:true})
window.addEventListener('load',keepMounted)
window.addEventListener('pageshow',keepMounted)
