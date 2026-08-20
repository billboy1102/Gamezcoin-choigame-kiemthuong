import { api } from './api.js'

const root = document.querySelector('#app')
const numberFmt = new Intl.NumberFormat('vi-VN')
const blockState = { block: null }
const f = (n) => numberFmt.format(Number(n || 0))
const e = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function friendly(message = '') {
  const map = {
    TOO_FAST: 'Phiên chơi quá nhanh nên không được cộng coin.',
    IMPOSSIBLE_SCORE: 'Điểm vượt ngưỡng hợp lý nên bị từ chối.',
    SESSION_EXPIRED: 'Phiên chơi đã hết hạn.',
    SESSION_ALREADY_FINISHED: 'Phiên này đã được xử lý.',
    TOO_MANY_SESSIONS: 'Bạn đang mở quá nhiều phiên game.',
    SERVER_TIMEOUT: 'Máy chủ phản hồi quá lâu. Hãy thử lại.'
  }
  return map[message] || message || 'Có lỗi xảy ra.'
}

function toast(message, type = '') {
  const toasts = document.querySelector('#toast-root')
  if (!toasts) return
  const node = document.createElement('div')
  node.className = `toast ${type}`
  node.textContent = message
  toasts.append(node)
  setTimeout(() => node.classList.add('show'), 10)
  setTimeout(() => node.remove(), 3200)
}

function returnToApp() {
  location.reload()
}

const BOARD_SIZE = 8
const COLORS = 6
const SHAPES = [
  [[0,0]], [[0,0],[0,1]], [[0,0],[1,0]],
  [[0,0],[0,1],[0,2]], [[0,0],[1,0],[2,0]],
  [[0,0],[0,1],[0,2],[0,3]], [[0,0],[1,0],[2,0],[3,0]],
  [[0,0],[0,1],[0,2],[0,3],[0,4]], [[0,0],[1,0],[2,0],[3,0],[4,0]],
  [[0,0],[0,1],[1,0],[1,1]],
  [[0,0],[1,0],[1,1]], [[0,1],[1,0],[1,1]], [[0,0],[0,1],[1,0]], [[0,0],[0,1],[1,1]],
  [[0,0],[1,0],[2,0],[2,1]], [[0,1],[1,1],[2,0],[2,1]],
  [[0,0],[0,1],[0,2],[1,1]], [[0,1],[1,0],[1,1],[2,1]],
  [[0,0],[1,0],[1,1],[1,2]], [[0,0],[0,1],[0,2],[1,2]],
  [[0,0],[0,1],[1,1],[1,2]], [[0,1],[0,2],[1,0],[1,1]],
  [[0,1],[1,0],[1,1],[1,2],[2,1]]
]

function normalizeShape(shape) {
  const minRow = Math.min(...shape.map((p) => p[0]))
  const minCol = Math.min(...shape.map((p) => p[1]))
  return shape.map((p) => [p[0] - minRow, p[1] - minCol])
}

function shapeSize(shape) {
  return {
    rows: Math.max(...shape.map((p) => p[0])) + 1,
    cols: Math.max(...shape.map((p) => p[1])) + 1
  }
}

function randomShape() {
  const filled = blockState.block ? blockState.block.board.filter(Boolean).length : 0
  const pool = filled > 42 ? SHAPES.filter((shape) => shape.length <= 4) : SHAPES
  return normalizeShape(pool[Math.floor(Math.random() * pool.length)])
}

function newPiece() {
  return { shape: randomShape(), color: 1 + Math.floor(Math.random() * COLORS) }
}

function newPieceSet() {
  return [newPiece(), newPiece(), newPiece()]
}

async function startBlockBlast() {
  if (blockState.block) return
  root.innerHTML = '<main class="play-loading"><section><div class="loader"></div><p>Đang tạo phiên Block Blast...</p></section></main>'
  try {
    const response = await api('start_game', { game_id: 'block-blast' })
    blockState.block = {
      session: response.session,
      game: response.game,
      startedAt: Date.now(),
      board: Array(BOARD_SIZE * BOARD_SIZE).fill(0),
      pieces: [],
      score: 0,
      combo: 0,
      bestCombo: 0,
      lines: 0,
      moves: 0,
      finishing: false,
      drag: null
    }
    blockState.block.pieces = newPieceSet()
    renderBlockBlast()
  } catch (error) {
    blockState.block = null
    toast(friendly(error.message), 'bad')
    returnToApp()
  }
}

function pieceHtml(piece, index) {
  const size = shapeSize(piece.shape)
  const blocks = piece.shape.map((point) => `<i data-color="${piece.color}" style="grid-row:${point[0] + 1};grid-column:${point[1] + 1}"></i>`).join('')
  return `<div class="play-slot"><div class="play-piece" data-piece="${index}" style="--rows:${size.rows};--cols:${size.cols}">${blocks}</div></div>`
}

function renderBlockBlast() {
  const b = blockState.block
  if (!b) return
  const cells = b.board.map((value, index) => `<div class="play-cell ${value ? 'filled' : ''}" data-cell="${index}" data-color="${value || 0}"></div>`).join('')
  const pieces = b.pieces.map((piece, index) => piece ? pieceHtml(piece, index) : '<div class="play-slot used"></div>').join('')
  root.innerHTML = `
    <main class="play-screen">
      <div class="play-top">
        <button id="block-back" class="play-back" aria-label="Quay lại">‹</button>
        <div class="play-score"><small>BLOCK BLAST</small><strong>${f(b.score)}</strong></div>
        <div class="play-combo"><small>COMBO</small><strong>${b.combo ? 'x' + b.combo : '—'}</strong></div>
      </div>
      <section class="play-content">
        <div id="play-board" class="play-board">${cells}</div>
        <div class="play-meta"><span>Hàng/cột <b>${b.lines}</b></span><span>Kéo khối vào lưới 8×8</span></div>
        <div class="play-pieces">${pieces}</div>
        <p class="play-tip">Xếp đầy một hàng hoặc cột để phá. Hết chỗ đặt các khối còn lại thì ván kết thúc.</p>
      </section>
    </main>`

  root.querySelector('#block-back').onclick = () => {
    if (confirm('Bỏ ván này? Ván chưa kết thúc sẽ không nhận coin.')) {
      cleanupDrag()
      blockState.block = null
      returnToApp()
    }
  }
  root.querySelectorAll('.play-piece').forEach(bindPieceDrag)
  if (isBlockGameOver()) setTimeout(finishBlockBlast, 350)
}

function canPlace(shape, row, col) {
  const b = blockState.block
  if (!b) return false
  return shape.every((point) => {
    const r = row + point[0]
    const c = col + point[1]
    return r >= 0 && c >= 0 && r < BOARD_SIZE && c < BOARD_SIZE && !b.board[r * BOARD_SIZE + c]
  })
}

function hasFit(shape) {
  const size = shapeSize(shape)
  for (let row = 0; row <= BOARD_SIZE - size.rows; row++) {
    for (let col = 0; col <= BOARD_SIZE - size.cols; col++) {
      if (canPlace(shape, row, col)) return true
    }
  }
  return false
}

function isBlockGameOver() {
  const b = blockState.block
  if (!b || b.finishing) return false
  const pieces = b.pieces.filter(Boolean)
  return pieces.length > 0 && pieces.every((piece) => !hasFit(piece.shape))
}

function clearPreview() {
  document.querySelectorAll('.play-cell.preview-ok,.play-cell.preview-bad').forEach((cell) => {
    cell.classList.remove('preview-ok', 'preview-bad')
  })
}

function cleanupDrag() {
  const drag = blockState.block?.drag
  if (drag?.ghost) drag.ghost.remove()
  clearPreview()
  if (blockState.block) blockState.block.drag = null
}

function bindPieceDrag(element) {
  element.onpointerdown = (event) => {
    const b = blockState.block
    if (!b || b.finishing) return
    event.preventDefault()
    const index = Number(element.dataset.piece)
    const piece = b.pieces[index]
    if (!piece) return
    const ghost = element.cloneNode(true)
    ghost.classList.add('play-floating')
    ghost.removeAttribute('data-piece')
    document.body.append(ghost)
    element.classList.add('dragging')
    b.drag = { index, piece, ghost, target: null, valid: false }
    try { element.setPointerCapture(event.pointerId) } catch {}
    updateDrag(event)
    element.onpointermove = updateDrag
    element.onpointerup = dropDrag
    element.onpointercancel = cancelDrag
  }
}

function updateDrag(event) {
  const drag = blockState.block?.drag
  const board = document.querySelector('#play-board')
  if (!drag || !board) return
  const rect = board.getBoundingClientRect()
  const cellSize = rect.width / BOARD_SIZE
  const size = shapeSize(drag.piece.shape)
  drag.ghost.style.left = `${event.clientX}px`
  drag.ghost.style.top = `${event.clientY - 66}px`
  const col = Math.round((event.clientX - rect.left) / cellSize - size.cols / 2)
  const row = Math.round((event.clientY - 66 - rect.top) / cellSize - size.rows / 2)
  drag.target = { row, col }
  drag.valid = canPlace(drag.piece.shape, row, col)
  clearPreview()
  drag.piece.shape.forEach((point) => {
    const r = row + point[0]
    const c = col + point[1]
    if (r < 0 || c < 0 || r >= BOARD_SIZE || c >= BOARD_SIZE) return
    const cell = document.querySelector(`[data-cell="${r * BOARD_SIZE + c}"]`)
    if (cell) cell.classList.add(drag.valid ? 'preview-ok' : 'preview-bad')
  })
}

function cancelDrag() {
  const drag = blockState.block?.drag
  if (!drag) return
  drag.ghost.remove()
  clearPreview()
  const original = document.querySelector(`[data-piece="${drag.index}"]`)
  if (original) original.classList.remove('dragging')
  blockState.block.drag = null
}

function dropDrag(event) {
  const drag = blockState.block?.drag
  if (!drag) return
  updateDrag(event)
  const valid = drag.valid
  const target = drag.target
  const index = drag.index
  drag.ghost.remove()
  clearPreview()
  blockState.block.drag = null
  if (valid && target) placePiece(index, target.row, target.col)
  else {
    const original = document.querySelector(`[data-piece="${index}"]`)
    if (original) original.classList.remove('dragging')
  }
}

function placePiece(index, row, col) {
  const b = blockState.block
  const piece = b?.pieces[index]
  if (!b || !piece || !canPlace(piece.shape, row, col)) return

  piece.shape.forEach((point) => {
    b.board[(row + point[0]) * BOARD_SIZE + col + point[1]] = piece.color
  })
  b.moves += 1
  b.score += piece.shape.length
  b.pieces[index] = null

  const fullRows = []
  const fullCols = []
  for (let r = 0; r < BOARD_SIZE; r++) {
    let full = true
    for (let c = 0; c < BOARD_SIZE; c++) if (!b.board[r * BOARD_SIZE + c]) full = false
    if (full) fullRows.push(r)
  }
  for (let c = 0; c < BOARD_SIZE; c++) {
    let full = true
    for (let r = 0; r < BOARD_SIZE; r++) if (!b.board[r * BOARD_SIZE + c]) full = false
    if (full) fullCols.push(c)
  }

  const cleared = fullRows.length + fullCols.length
  if (cleared > 0) {
    b.combo += 1
    b.bestCombo = Math.max(b.bestCombo, b.combo)
    b.lines += cleared
    b.score += cleared * 8 + b.combo * 3
    fullRows.forEach((r) => { for (let c = 0; c < BOARD_SIZE; c++) b.board[r * BOARD_SIZE + c] = 0 })
    fullCols.forEach((c) => { for (let r = 0; r < BOARD_SIZE; r++) b.board[r * BOARD_SIZE + c] = 0 })
  } else {
    b.combo = 0
  }

  if (b.pieces.every((item) => !item)) b.pieces = newPieceSet()
  renderBlockBlast()
}

async function finishBlockBlast() {
  const b = blockState.block
  if (!b || b.finishing) return
  b.finishing = true
  cleanupDrag()
  const finalScore = b.score
  root.innerHTML = `<main class="play-loading"><section><div class="loader"></div><p>Server đang xác minh ${f(finalScore)} điểm...</p></section></main>`
  try {
    const elapsed = Date.now() - b.startedAt
    const minimum = Number(b.game?.min_duration_ms || 0)
    if (elapsed < minimum + 250) await wait(minimum + 250 - elapsed)
    const result = await api('finish_game', { session_id: b.session.id, score: finalScore })
    if (result.result?.rejected) throw new Error(result.result.reason || 'IMPOSSIBLE_SCORE')
    const coin = Number(result.result?.game_coin || 0)
    const referral = Number(result.result?.referral_invitee_coin || 0)
    root.innerHTML = `
      <main class="play-result">
        <section class="play-result-card">
          <div class="play-result-icon">🧩</div>
          <h2>Kết thúc ván</h2>
          <div class="play-result-score">${f(finalScore)} điểm</div>
          <p>${b.lines} hàng/cột · combo tốt nhất x${Math.max(1, b.bestCombo)}</p>
          <strong class="earned">+${f(coin)} coin</strong>
          ${referral ? `<p>Thưởng giới thiệu +${f(referral)} coin</p>` : ''}
          <button id="claim-game" class="primary play-action">Nhận thưởng</button>
        </section>
      </main>`
    root.querySelector('#claim-game').onclick = () => {
      blockState.block = null
      returnToApp()
    }
  } catch (error) {
    root.innerHTML = `
      <main class="play-result">
        <section class="play-result-card">
          <div class="play-result-icon">⚠️</div>
          <h2>Không được cộng coin</h2>
          <p>${e(friendly(error.message))}</p>
          <button id="close-game" class="secondary play-action">Quay lại</button>
        </section>
      </main>`
    root.querySelector('#close-game').onclick = () => {
      blockState.block = null
      returnToApp()
    }
  }
}

globalThis.GamezcoinStartBlockBlast = startBlockBlast
