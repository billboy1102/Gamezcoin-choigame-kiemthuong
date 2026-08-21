const SHOWCASE_SRC='/assets/gamezcoin-rewards-direct.jpg?v=20260822-0135'

const css=`
.gc-public-live-games::before{display:none!important;content:none!important}
.gc-inline-hero-art{display:none!important}
.gc-force-showcase{display:block!important;width:min(640px,calc(100% - 24px))!important;margin:0 auto 22px!important;position:relative!important;z-index:20!important;background:transparent!important}
.gc-force-showcase img{display:block!important;width:100%!important;height:auto!important;max-width:100%!important;border:0!important;background:transparent!important;object-fit:contain!important}
@media(max-width:700px){.gc-force-showcase{width:min(390px,calc(100vw - 24px))!important;margin:0 auto 18px!important}}
`
function ensureStyle(){let style=document.getElementById('gc-force-showcase-style');if(!style){style=document.createElement('style');style.id='gc-force-showcase-style';document.head.appendChild(style)}style.textContent=css}
function mountShowcase(){ensureStyle();const section=document.querySelector('.gc-public-live-games');if(!section)return false;let wrap=section.querySelector('.gc-force-showcase');if(!wrap){wrap=document.createElement('div');wrap.className='gc-force-showcase';section.insertBefore(wrap,section.firstChild)}let img=wrap.querySelector('img');if(!img){img=document.createElement('img');img.alt='';img.loading='eager';img.decoding='sync';wrap.replaceChildren(img)}img.src=SHOWCASE_SRC;return true}
ensureStyle();if(!mountShowcase()){const root=document.getElementById('app')||document.body;const observer=new MutationObserver(()=>{if(mountShowcase())observer.disconnect()});observer.observe(root,{childList:true,subtree:true});window.setTimeout(()=>observer.disconnect(),12000)}
