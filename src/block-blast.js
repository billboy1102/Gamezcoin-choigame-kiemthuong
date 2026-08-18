import './block-blast.css'
import { api } from './api.js'

const GAME_ID='block-blast'
const SIZE=8
const COLORS=6
const fmt=new Intl.NumberFormat('vi-VN')
let state=null

const SHAPES=[
  [[0,0]],
  [[0,0],[0,1]], [[0,0],[1,0]],
  [[0,0],[0,1],[0,2]], [[0,0],[1,0],[2,0]],
  [[0,0],[0,1],[0,2],[0,3]], [[0,0],[1,0],[2,0],[3,0]],
  [[0,0],[0,1],[0,2],[0,3],[0,4]], [[0,0],[1,0],[2,0],[3,0],[4,0]],
  [[0,0],[0,1],[1,0],[1,1]],
  [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2],[2,0],[2,1],[2,2]],
  [[0,0],[1,0],[1,1]], [[0,1],[1,0],[1,1]], [[0,0],[0,1],[1,0]], [[0,0],[0,1],[1,1]],
  [[0,0],[1,0],[2,0],[2,1]], [[0,1],[1,1],[2,0],[2,1]],
  [[0,0],[0,1],[0,2],[1,1]], [[0,1],[1,0],[1,1],[2,1]],
  [[0,0],[1,0],[1,1],[1,2]], [[0,0],[0,1],[0,2],[1,2]],
  [[0,0],[0,1],[1,1],[1,2]], [[0,1],[0,2],[1,0],[1,1]],
  [[0,0],[0,2],[1,0],[1,1],[1,2]],
  [[0,0],[0,1],[0,2],[1,0],[1,2]],
  [[0,1],[1,0],[1,1],[1,2],[2,1]]
]

function normalize(shape){
  const minR=Math.min(...shape.map(x=>x[0])),minC=Math.min(...shape.map(x=>x[1]))
  return shape.map(([r,c])=>[r-minR,c-minC])
}
function dims(shape){return {h:Math.max(...shape.map(x=>x[0]))+1,w:Math.max(...shape.map(x=>x[1]))+1}}
function chooseShape(){
  const filled=state?.board?.filter(Boolean).length||0
  const pool=filled>42?SHAPES.filter(s=>s.length<=4):SHAPES
  return normalize(pool[Math.floor(Math.random()*pool.length)])
}
function newPiece(){return {shape:chooseShape(),color:1+Math.floor(Math.random()*COLORS)}}
function newSet(){return [newPiece(),newPiece(),newPiece()]}

// Intercept only the Block Blast button. Do not observe/mutate the whole DOM:
// on Safari the old MutationObserver re-triggered itself endlessly when it
// rewrote the icon text, leaving the app stuck on the loading spinner.
document.addEventListener('click',ev=>{
  const btn=ev.target.closest?.(`[data-play="${GAME_ID}"]`)
  if(!btn)return
  ev.preventDefault()
  ev.stopPropagation()
  ev.stopImmediatePropagation()
  startGame()
},true)

function modal(html){
  let m=document.querySelector('#gm')
  if(!m){m=document.createElement('div');m.id='gm';m.className='modal';document.body.append(m)}
  m.innerHTML=`<section class="stage bb-stage">${html}</section>`
  return m.querySelector('.stage')
}
function closeModal(){document.querySelector('#gm')?.remove();state=null}
function loading(text='Đang tạo phiên chơi...'){modal(`<div class="loader"></div><p>${text}</p>`)}
function friendly(message){
  return ({TOO_FAST:'Phiên chơi quá nhanh nên không được cộng coin.',IMPOSSIBLE_SCORE:'Điểm vượt ngưỡng hợp lý nên bị từ chối.',SESSION_EXPIRED:'Phiên chơi đã hết hạn.',SESSION_ALREADY_FINISHED':'Phiên này đã được xử lý.',TOO_MANY_SESSIONS:'Bạn đang mở quá nhiều phiên game. Hãy đóng các ván cũ rồi thử lại.'})[message]||message||'Không thể kết nối máy chủ.'
}

async function startGame(){
  if(state)return
  try{
    loading()
    const data=await api('start_game',{game_id:GAME_ID})
    state={session:data.session,game:data.game,startedAt:Date.now(),board:Array(SIZE*SIZE).fill(0),pieces:[],score:0,combo:0,bestCombo:0,lines:0,moves:0,finishing:false,drag:null}
    state.pieces=newSet()
    render()
  }catch(error){closeModal();alert(friendly(error.message))}
}

function render(){
  if(!state)return
  const cells=state.board.map((v,i)=>`<div class="bb-cell ${v?'filled':''}" data-cell="${i}" data-color="${v||0}"></div>`).join('')
  const pieces=state.pieces.map((p,i)=>p?pieceHtml(p,i):'<div class="bb-piece-slot used"></div>').join('')
  const stage=modal(`
    <div class="bb-head">
      <button id="bb-exit" class="bb-icon-btn" aria-label="Bỏ ván">✕</button>
      <div><small>BLOCK BLAST</small><strong id="bb-score">${fmt.format(state.score)}</strong></div>
      <div class="bb-combo"><small>COMBO</small><strong>${state.combo?`x${state.combo}`:'—'}</strong></div>
    </div>
    <div class="bb-board-wrap">
      <div id="bb-board" class="bb-board">${cells}</div>
      <div id="bb-pop" class="bb-pop"></div>
    </div>
    <div class="bb-info"><span>Hàng/cột đã phá <b>${state.lines}</b></span><span>Kéo khối vào lưới 8×8</span></div>
    <div id="bb-pieces" class="bb-pieces">${pieces}</div>
    <small class="bb-tip">Đặt đủ một hàng hoặc cột để phá. Không xoay khối. Hết chỗ đặt cả 3 khối = kết thúc ván.</small>
  `)
  stage.querySelector('#bb-exit').onclick=()=>{
    if(confirm('Bỏ ván này? Ván chưa kết thúc sẽ không nhận coin.'))closeModal()
  }
  stage.querySelectorAll('.bb-piece').forEach(el=>bindDrag(el))
  if(isGameOver())setTimeout(()=>finishGame(),420)
}

function pieceHtml(piece,index){
  const {h,w}=dims(piece.shape)
  const blocks=piece.shape.map(([r,c])=>`<i style="grid-row:${r+1};grid-column:${c+1}" data-color="${piece.color}"></i>`).join('')
  return `<div class="bb-piece-slot"><div class="bb-piece" data-piece="${index}" data-h="${h}" data-w="${w}" style="--rows:${h};--cols:${w}">${blocks}</div></div>`
}

function bindDrag(el){
  el.onpointerdown=ev=>{
    if(!state||state.finishing)return
    ev.preventDefault()
    const index=Number(el.dataset.piece),piece=state.pieces[index]
    if(!piece)return
    const ghost=el.cloneNode(true)
    ghost.classList.add('bb-floating')
    ghost.removeAttribute('data-piece')
    document.body.append(ghost)
    el.classList.add('dragging')
    state.drag={index,piece,ghost,target:null,valid:false}
    try{el.setPointerCapture(ev.pointerId)}catch{}
    updateDrag(ev)
    el.onpointermove=updateDrag
    el.onpointerup=dropDrag
    el.onpointercancel=cancelDrag
  }
}
function clearPreview(){document.querySelectorAll('.bb-cell.preview-ok,.bb-cell.preview-bad').forEach(x=>x.classList.remove('preview-ok','preview-bad'))}
function updateDrag(ev){
  const d=state?.drag;if(!d)return
  const board=document.querySelector('#bb-board');if(!board)return
  const rect=board.getBoundingClientRect(),cell=rect.width/SIZE,{h,w}=dims(d.piece.shape)
  d.ghost.style.left=`${ev.clientX}px`;d.ghost.style.top=`${ev.clientY-72}px`
  const col=Math.round((ev.clientX-rect.left)/cell-w/2)
  const row=Math.round((ev.clientY-72-rect.top)/cell-h/2)
  d.target={row,col};d.valid=canPlace(d.piece.shape,row,col)
  clearPreview()
  d.piece.shape.forEach(([rr,cc])=>{
    const r=row+rr,c=col+cc
    if(r<0||c<0||r>=SIZE||c>=SIZE)return
    const x=document.querySelector(`[data-cell="${r*SIZE+c}"]`)
    if(x)x.classList.add(d.valid?'preview-ok':'preview-bad')
  })
}
function cancelDrag(){
  const d=state?.drag;if(!d)return
  d.ghost.remove();clearPreview();document.querySelector(`[data-piece="${d.index}"]`)?.classList.remove('dragging');state.drag=null
}
function dropDrag(ev){
  const d=state?.drag;if(!d)return
  updateDrag(ev)
  const {valid,target,index}=d
  d.ghost.remove();clearPreview();state.drag=null
  if(valid)place(index,target.row,target.col)
  else document.querySelector(`[data-piece="${index}"]`)?.classList.remove('dragging')
}

function canPlace(shape,row,col){
  if(!state)return false
  return shape.every(([r,c])=>{
    const rr=row+r,cc=col+c
    return rr>=0&&cc>=0&&rr<SIZE&&cc<SIZE&&!state.board[rr*SIZE+cc]
  })
}
function hasFit(shape){
  const {h,w}=dims(shape)
  for(let r=0;r<=SIZE-h;r++)for(let c=0;c<=SIZE-w;c++)if(canPlace(shape,r,c))return true
  return false
}
function isGameOver(){
  if(!state||state.finishing)return false
  const left=state.pieces.filter(Boolean)
  return left.length>0&&left.every(p=>!hasFit(p.shape))
}

function place(index,row,col){
  const piece=state?.pieces[index];if(!piece||!canPlace(piece.shape,row,col))return
  piece.shape.forEach(([r,c])=>state.board[(row+r)*SIZE+col+c]=piece.color)
  state.moves++
  state.score+=piece.shape.length
  state.pieces[index]=null

  const fullRows=[],fullCols=[]
  for(let r=0;r<SIZE;r++)if(Array.from({length:SIZE},(_,c)=>state.board[r*SIZE+c]).every(Boolean))fullRows.push(r)
  for(let c=0;c<SIZE;c++)if(Array.from({length:SIZE},(_,r)=>state.board[r*SIZE+c]).every(Boolean))fullCols.push(c)
  const cleared=fullRows.length+fullCols.length
  if(cleared){
    state.combo++
    state.bestCombo=Math.max(state.bestCombo,state.combo)
    state.lines+=cleared
    state.score+=cleared*8+state.combo*3
    fullRows.forEach(r=>{for(let c=0;c<SIZE;c++)state.board[r*SIZE+c]=0})
    fullCols.forEach(c=>{for(let r=0;r<SIZE;r++)state.board[r*SIZE+c]=0})
  }else state.combo=0

  if(state.pieces.every(x=>!x))state.pieces=newSet()
  render()
  if(cleared)requestAnimationFrame(()=>burst(cleared,state?.combo||1))
}
function burst(lines,combo){
  const pop=document.querySelector('#bb-pop')
  if(!pop)return
  pop.textContent=combo>1?`COMBO x${combo}  +${lines*8+combo*3}`:`+${lines*8+combo*3}`
  pop.classList.remove('show');requestAnimationFrame(()=>pop.classList.add('show'))
}

async function finishGame(){
  if(!state||state.finishing)return
  state.finishing=true
  const final={score:state.score,lines:state.lines,combo:state.bestCombo,moves:state.moves}
  loading(`Hết chỗ đặt. Server đang xác minh ${fmt.format(final.score)} điểm...`)
  try{
    const elapsed=Date.now()-state.startedAt
    const wait=Math.max(0,Number(state.game.min_duration_ms||0)+250-elapsed)
    if(wait)await new Promise(r=>setTimeout(r,wait))
    const result=await api('finish_game',{session_id:state.session.id,score:final.score})
    if(result.result?.rejected)throw new Error(result.result.reason||'IMPOSSIBLE_SCORE')
    const coin=Number(result.result?.game_coin||0),ref=Number(result.result?.referral_invitee_coin||0)
    const stage=modal(`
      <div class="bb-result-icon">🧩</div><h2>Kết thúc ván</h2>
      <div class="bb-result-score">${fmt.format(final.score)} điểm</div>
      <p>${final.lines} hàng/cột · combo tốt nhất x${Math.max(1,final.combo)}</p>
      <strong class="earned">+${fmt.format(coin)} coin</strong>
      ${ref?`<p>Thưởng giới thiệu +${fmt.format(ref)} coin</p>`:''}
      <button id="bb-done" class="primary">Nhận thưởng</button>
    `)
    stage.querySelector('#bb-done').onclick=()=>location.reload()
  }catch(error){
    const stage=modal(`<div class="bb-result-icon">⚠️</div><h2>Không được cộng coin</h2><p>${friendly(error.message)}</p><button id="bb-done" class="secondary">Đóng</button>`)
    stage.querySelector('#bb-done').onclick=closeModal
  }
}
