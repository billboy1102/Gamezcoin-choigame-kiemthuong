const ENCODED_IMAGE_SRC = '/assets/gamezcoin-rewards-exact.png?v=20260821-2348'
let decodedObjectUrl = ''
let decodePromise = null

const css = `
.gc-public-live-games{position:relative!important}
.gc-public-live-games::before{display:none!important;content:none!important}
.gc-inline-hero-art{display:none!important}
.gc-force-showcase{display:block!important;width:min(640px,calc(100% - 24px))!important;margin:0 auto 22px!important;position:relative!important;z-index:20!important;opacity:1!important;visibility:visible!important;transform:none!important}
.gc-force-showcase img{display:block!important;width:100%!important;height:auto!important;max-width:100%!important;object-fit:contain!important;border:0!important;background:transparent!important;opacity:0!important;visibility:hidden!important;filter:drop-shadow(0 18px 32px rgba(0,0,0,.28))!important}
.gc-force-showcase img.gc-showcase-loaded{opacity:1!important;visibility:visible!important}
@media(max-width:700px){.gc-force-showcase{width:min(390px,calc(100vw - 24px))!important;margin:0 auto 18px!important}.gc-public-live-games{margin-top:24px!important;padding-top:0!important}}
`

function ensureStyle(){
  let style=document.getElementById('gc-force-showcase-style')
  if(!style){style=document.createElement('style');style.id='gc-force-showcase-style';document.head.appendChild(style)}
  style.textContent=css
}

async function getDecodedImageUrl(){
  if(decodedObjectUrl) return decodedObjectUrl
  if(decodePromise) return decodePromise
  decodePromise=(async()=>{
    const response=await fetch(ENCODED_IMAGE_SRC,{cache:'no-store'})
    if(!response.ok) throw new Error(`showcase source ${response.status}`)
    const encoded=(await response.text()).replace(/\s+/g,'')
    const binary=atob(encoded)
    const bytes=new Uint8Array(binary.length)
    for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i)
    const blob=new Blob([bytes],{type:'image/png'})
    decodedObjectUrl=URL.createObjectURL(blob)
    return decodedObjectUrl
  })().catch(error=>{console.error('[Gamezcoin] image decode failed',error);decodePromise=null;return ''})
  return decodePromise
}

function getOrCreateImage(){
  const section=document.querySelector('.gc-public-live-games')
  if(!section) return null
  let wrap=section.querySelector('.gc-force-showcase')
  if(!wrap){wrap=document.createElement('div');wrap.className='gc-force-showcase';section.insertBefore(wrap,section.firstChild)}
  let img=wrap.querySelector('img')
  if(!img){
    wrap.replaceChildren()
    img=document.createElement('img')
    img.alt='Gamezcoin rewards artwork'
    img.decoding='async'
    img.loading='eager'
    img.addEventListener('load',()=>img.classList.add('gc-showcase-loaded'))
    img.addEventListener('error',()=>img.classList.remove('gc-showcase-loaded'))
    wrap.appendChild(img)
  }
  return img
}

async function mountShowcase(){
  ensureStyle()
  const img=getOrCreateImage()
  if(!img) return false
  const src=await getDecodedImageUrl()
  if(!src) return false
  if(img.src!==src){img.classList.remove('gc-showcase-loaded');img.src=src}
  else if(img.complete&&img.naturalWidth>0) img.classList.add('gc-showcase-loaded')
  return true
}

function keepMounted(){requestAnimationFrame(()=>mountShowcase())}
ensureStyle();mountShowcase()
const root=document.getElementById('app')||document.body
const observer=new MutationObserver(keepMounted)
observer.observe(root,{childList:true,subtree:true})
window.addEventListener('load',keepMounted)
window.addEventListener('pageshow',keepMounted)
document.addEventListener('visibilitychange',()=>{if(!document.hidden)keepMounted()})
