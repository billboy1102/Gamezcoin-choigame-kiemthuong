const ENCODED_IMAGE_SRC = '/assets/gamezcoin-rewards-exact.png?v=20260821-2358'
let dataUriPromise = null

const css = `
.gc-public-live-games{position:relative!important}
.gc-public-live-games::before{display:none!important;content:none!important}
.gc-inline-hero-art{display:none!important}
.gc-force-showcase{display:block!important;width:min(640px,calc(100% - 24px))!important;margin:0 auto 22px!important;position:relative!important;z-index:20!important;min-height:1px!important}
.gc-force-showcase img{display:block!important;width:100%!important;height:auto!important;max-width:100%!important;object-fit:contain!important;border:0!important;background:transparent!important;filter:drop-shadow(0 18px 32px rgba(0,0,0,.28))!important}
@media(max-width:700px){.gc-force-showcase{width:min(390px,calc(100vw - 24px))!important;margin:0 auto 18px!important}.gc-public-live-games{margin-top:24px!important;padding-top:0!important}}
`

function ensureStyle(){
  let style=document.getElementById('gc-force-showcase-style')
  if(!style){style=document.createElement('style');style.id='gc-force-showcase-style';document.head.appendChild(style)}
  style.textContent=css
}

async function getDataUri(){
  if(dataUriPromise) return dataUriPromise
  dataUriPromise=fetch(ENCODED_IMAGE_SRC,{cache:'no-store'})
    .then(r=>{if(!r.ok)throw new Error(`showcase source ${r.status}`);return r.text()})
    .then(text=>{
      const encoded=text.replace(/\s+/g,'')
      if(!encoded.startsWith('iVBOR')) throw new Error('showcase asset is not expected PNG base64')
      return `data:image/png;base64,${encoded}`
    })
    .catch(error=>{console.error('[Gamezcoin] showcase load failed',error);dataUriPromise=null;return ''})
  return dataUriPromise
}

function getOrCreateImage(){
  const section=document.querySelector('.gc-public-live-games')
  if(!section) return null
  document.querySelectorAll('.gc-force-showcase').forEach((node,index)=>{if(index>0)node.remove()})
  let wrap=section.querySelector('.gc-force-showcase')
  if(!wrap){wrap=document.createElement('div');wrap.className='gc-force-showcase';section.insertBefore(wrap,section.firstChild)}
  let img=wrap.querySelector('img')
  if(!img){
    wrap.replaceChildren()
    img=document.createElement('img')
    img.alt='Gamezcoin rewards artwork'
    img.width=1254
    img.height=1254
    img.loading='eager'
    img.decoding='sync'
    wrap.appendChild(img)
  }
  return img
}

async function mountShowcase(){
  ensureStyle()
  const img=getOrCreateImage()
  if(!img) return false
  const src=await getDataUri()
  if(!src) return false
  if(img.getAttribute('src')!==src) img.setAttribute('src',src)
  return true
}

let scheduled=false
function keepMounted(){
  if(scheduled)return
  scheduled=true
  requestAnimationFrame(()=>{scheduled=false;mountShowcase()})
}

ensureStyle();mountShowcase()
const root=document.getElementById('app')||document.body
new MutationObserver(keepMounted).observe(root,{childList:true,subtree:true})
window.addEventListener('load',keepMounted)
window.addEventListener('pageshow',keepMounted)
