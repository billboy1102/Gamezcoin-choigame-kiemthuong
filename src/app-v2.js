import './styles.css'
import './app-v2.css'
import { supabase, api, adminApi } from './api.js'

const root = document.querySelector('#app')
const toasts = document.querySelector('#toast-root')
const numberFmt = new Intl.NumberFormat('vi-VN')
const state = { data: null, tab: 'games', mode: 'login', block: null }

const f = (n) => numberFmt.format(Number(n || 0))
const e = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function toast(message, type = '') {
  const node = document.createElement('div')
  node.className = `toast ${type}`
  node.textContent = message
  toasts.append(node)
  setTimeout(() => node.classList.add('show'), 10)
  setTimeout(() => node.remove(), 3200)
}

function friendly(message = '') {
  const map = {
    'Invalid login credentials': 'Email hoặc mật khẩu không đúng.',
    'Email not confirmed': 'Hãy xác nhận email trước khi đăng nhập.',
    TOO_FAST: 'Phiên chơi quá nhanh nên không được cộng coin.',
    IMPOSSIBLE_SCORE: 'Điểm vượt ngưỡng hợp lý nên bị từ chối.',
    SESSION_EXPIRED: 'Phiên chơi đã hết hạn.',
    SESSION_ALREADY_FINISHED: 'Phiên này đã được xử lý.',
    BELOW_MIN_WITHDRAWAL: 'Chưa đạt mức rút tối thiểu.',
    INSUFFICIENT_BALANCE: 'Số dư coin không đủ.',
    TOO_MANY_SESSIONS: 'Bạn đang mở quá nhiều phiên game.',
    SERVER_TIMEOUT: 'Máy chủ phản hồi quá lâu. Hãy thử lại.'
  }
  return map[message] || message || 'Có lỗi xảy ra.'
}

async function load(action = 'bootstrap', draw = true) {
  state.data = await api(action)
  if (draw) renderApp()
  return state.data
}

function renderAuth() {
  const login = state.mode === 'login'
  root.innerHTML = `
    <main class="auth">
      <section class="brand">
        <div class="coin">G</div>
        <div><h1>Gamezcoin</h1><p>Chơi Game & Kiếm Thưởng</p></div>
      </section>
      <section class="card authbox">
        <div class="switch">
          <button data-mode="login" class="${login ? 'on' : ''}">Đăng nhập</button>
          <button data-mode="signup" class="${login ? '' : 'on'}">Đăng ký</button>
        </div>
        <form id="auth-form">
          ${login ? '' : '<label>Tên hiển thị<input name="name" minlength="2" maxlength="40" required></label>'}
          <label>Email<input name="email" type="email" required></label>
          <label>Mật khẩu<input name="password" type="password" minlength="6" required></label>
          ${login ? '' : '<label>Mã giới thiệu (không bắt buộc)<input name="ref" maxlength="16"></label>'}
          <button class="primary" type="submit">${login ? 'Đăng nhập' : 'Tạo tài khoản'}</button>
        </form>
        <button id="google-login" class="google">Đăng nhập bằng Google</button>
        <small>Tài khoản và coin được lưu trên server, dùng chung giữa nhiều thiết bị.</small>
      </section>
    </main>`

  root.querySelectorAll('[data-mode]').forEach((button) => {
    button.onclick = () => {
      state.mode = button.dataset.mode
      renderAuth()
    }
  })

  root.querySelector('#auth-form').onsubmit = async (event) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const email = String(data.get('email') || '').trim()
    const password = String(data.get('password') || '')
    try {
      if (login) {
        const result = await supabase.auth.signInWithPassword({ email, password })
        if (result.error) throw result.error
      } else {
        const displayName = String(data.get('name') || '').trim()
        const referralCode = String(data.get('ref') || '').trim().toUpperCase() || null
        const result = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName, referral_code: referralCode } }
        })
        if (result.error) throw result.error
        if (!result.data.session) {
          toast('Đã đăng ký. Hãy xác nhận email rồi đăng nhập.', 'ok')
          state.mode = 'login'
          renderAuth()
        }
      }
    } catch (error) {
      toast(friendly(error.message), 'bad')
    }
  }

  root.querySelector('#google-login').onclick = async () => {
    const result = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: location.origin + location.pathname }
    })
    if (result.error) toast(friendly(result.error.message), 'bad')
  }
}

function nav(id, icon, text) {
  return `<button data-tab="${id}" class="${state.tab === id ? 'on' : ''}"><b>${icon}</b><small>${text}</small></button>`
}

function renderApp() {
  if (!state.data) {
    renderAuth()
    return
  }
  const d = state.data
  root.innerHTML = `
    <div class="shell">
      <header>
        <div><small>GAMEZCOIN</small><strong>${e(d.profile?.display_name || 'Người chơi')}</strong></div>
        <button data-tab="wallet" class="balance"><span>G</span>${f(d.wallet?.balance)} coin</button>
      </header>
      <main id="view"></main>
      <nav>
        ${nav('games', '🎮', 'Game')}
        ${nav('checkin', '📅', 'Điểm danh')}
        ${nav('wallet', '🪙', 'Ví')}
        ${nav('ref', '👥', 'Giới thiệu')}
        ${nav('account', '👤', 'Tài khoản')}
      </nav>
    </div>`

  root.querySelectorAll('[data-tab]').forEach((button) => {
    button.onclick = () => {
      state.tab = button.dataset.tab
      renderApp()
    }
  })

  const views = { games: renderGames, checkin: renderCheckin, wallet: renderWallet, ref: renderReferral, account: renderAccount }
  views[state.tab]()
}

function renderGames() {
  const view = root.querySelector('#view')
  // Home is rendered exclusively by home-reference.js. Keeping this view
  // empty removes the legacy Home completely, so it can never flash first.
  view.dataset.gcPremiumHome = ''
  view.replaceChildren()
}

function renderCheckin() {
  const view = root.querySelector('#view')
  const reward = Number(state.data.settings?.daily_checkin_coin || 100)
  view.innerHTML = `
    <section class="card center">
      <div class="emoji">📅</div>
      <h2>+${f(reward)} coin</h2>
      <p>Mỗi ngày nhận một lần. Coin chơi game không giới hạn theo ngày.</p>
      <button id="claim" class="primary">Điểm danh ngay</button>
    </section>`
  view.querySelector('#claim').onclick = async () => {
    try {
      const result = await api('checkin')
      toast(result.result.claimed ? `+${f(result.result.reward_coin)} coin` : 'Hôm nay bạn đã điểm danh.', 'ok')
      await load('dashboard')
    } catch (error) {
      toast(friendly(error.message), 'bad')
    }
  }
}

const withdrawalStatus = (value) => ({ pending: 'Đang chờ', paid: 'Đã thanh toán', rejected: 'Từ chối' }[value] || value)

async function renderWallet() {
  const view = root.querySelector('#view')
  view.innerHTML = '<div class="loader"></div>'
  try {
    await load('dashboard', false)
  } catch (error) {
    toast(friendly(error.message), 'bad')
  }
  const d = state.data
  const wallet = d.wallet || {}
  const minimum = Number(d.settings?.min_withdrawal_coin || 20000)
  view.innerHTML = `
    <section class="wallet">
      <small>SỐ DƯ</small>
      <h1>${f(wallet.balance)} <span>coin</span></h1>
      <p>Đã kiếm ${f(wallet.lifetime_earned)} · Đã rút ${f(wallet.lifetime_withdrawn)}</p>
    </section>
    <section class="card">
      <h3>Rút tiền</h3>
      <form id="withdraw-form">
        <label>Số coin<input name="amount" type="number" min="${minimum}" required placeholder="Tối thiểu ${minimum}"></label>
        <label>Phương thức<select name="method"><option value="momo">MoMo</option><option value="bank">Ngân hàng</option></select></label>
        <label>Chủ tài khoản<input name="name" required></label>
        <label>SĐT / số tài khoản<input name="number" required></label>
        <label>Tên ngân hàng<input name="bank"></label>
        <button class="primary">Gửi yêu cầu rút</button>
      </form>
      <small>Nếu admin từ chối, coin được hoàn tự động.</small>
    </section>
    <section class="card"><h3>Lịch sử rút</h3>
      ${(d.withdrawals || []).map((item) => `<div class="row"><span>${f(item.coin_amount)} coin<small>${new Date(item.created_at).toLocaleString('vi-VN')}</small></span><b class="${item.status}">${withdrawalStatus(item.status)}</b></div>`).join('') || '<p>Chưa có yêu cầu.</p>'}
    </section>
    <section class="card"><h3>Biến động coin</h3>
      ${(d.ledger || []).map((item) => `<div class="row"><span>${e(item.description)}<small>${new Date(item.created_at).toLocaleString('vi-VN')}</small></span><b class="${Number(item.amount) > 0 ? 'plus' : 'minus'}">${Number(item.amount) > 0 ? '+' : ''}${f(item.amount)}</b></div>`).join('') || '<p>Chưa có giao dịch.</p>'}
    </section>`

  view.querySelector('#withdraw-form').onsubmit = async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      await api('withdraw', {
        coin_amount: Number(form.get('amount')),
        method: form.get('method'),
        account_name: form.get('name'),
        account_number: form.get('number'),
        bank_name: form.get('bank')
      })
      toast('Đã gửi yêu cầu rút.', 'ok')
      await load('dashboard')
    } catch (error) {
      toast(friendly(error.message), 'bad')
    }
  }
}

function renderReferral() {
  const d = state.data
  const view = root.querySelector('#view')
  const code = d.profile?.referral_code || ''
  view.innerHTML = `
    <section class="card center">
      <div class="emoji">👥</div>
      <p>Mã giới thiệu của bạn</p>
      <div class="refcode">${e(code)}</div>
      <button id="copy-ref" class="primary">Sao chép mã</button>
    </section>
    <section class="card">
      <div class="row"><span>Bạn nhận</span><b class="plus">+${f(d.settings?.referral_inviter_coin)} coin</b></div>
      <div class="row"><span>Người được mời nhận</span><b class="plus">+${f(d.settings?.referral_invitee_coin)} coin</b></div>
      <small>Thưởng sau phiên Block Blast hợp lệ đầu tiên của người được mời.</small>
    </section>`
  view.querySelector('#copy-ref').onclick = async () => {
    try { await navigator.clipboard.writeText(code) } catch {}
    toast('Đã sao chép.', 'ok')
  }
}

function renderAccount() {
  const d = state.data
  const view = root.querySelector('#view')
  view.innerHTML = `
    <section class="card center">
      <div class="avatar">${e((d.profile?.display_name || 'G')[0])}</div>
      <h2>${e(d.profile?.display_name || 'Người chơi')}</h2>
      <p>${e(d.user?.email || '')}</p>
      ${d.is_admin ? '<b class="adminbadge">ADMIN</b>' : ''}
    </section>
    <section class="card">
      <form id="profile-form">
        <label>Tên hiển thị<input name="name" value="${e(d.profile?.display_name || '')}" minlength="2" maxlength="40" required></label>
        <button class="secondary">Lưu tên</button>
      </form>
    </section>
    ${d.is_admin ? '<button id="admin-button" class="adminbtn">🛡️ Trang quản trị</button>' : ''}
    <button id="logout-button" class="danger">Đăng xuất</button>`

  view.querySelector('#profile-form').onsubmit = async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      await api('update_profile', { display_name: form.get('name') })
      await load()
      toast('Đã lưu.', 'ok')
    } catch (error) {
      toast(friendly(error.message), 'bad')
    }
  }
  view.querySelector('#logout-button').onclick = () => supabase.auth.signOut()
  const adminButton = view.querySelector('#admin-button')
  if (adminButton) adminButton.onclick = () => renderAdmin()
}

async function renderAdmin() {
  const view = root.querySelector('#view')
  view.innerHTML = '<div class="loader"></div>'
  try {
    const [overview, users, withdrawals] = await Promise.all([
      adminApi('overview'),
      adminApi('users', { per_page: 100 }),
      adminApi('withdrawals', { status: 'all' })
    ])
    view.innerHTML = `
      <button id="admin-back" class="secondary">← Quay lại</button>
      <h2>Quản trị Gamezcoin</h2>
      <div class="stats">
        <div>Người dùng<b>${f(overview.users)}</b></div>
        <div>Coin lưu hành<b>${f(overview.circulating_coin)}</b></div>
        <div>Chờ rút<b>${f(overview.pending_withdrawals)}</b></div>
        <div>Coin chờ rút<b>${f(overview.pending_coin)}</b></div>
      </div>
      <section class="card"><h3>Yêu cầu rút</h3>
        ${(withdrawals.withdrawals || []).map((item) => `
          <article class="adminrow">
            <div><b>${e(item.profile?.display_name || item.user_id)}</b><small>${e(String(item.method || '').toUpperCase())} · ${e(item.account_name)} · ${e(item.account_number)} ${e(item.bank_name || '')}</small></div>
            <strong>${f(item.coin_amount)} coin</strong>
            ${item.status === 'pending' ? `<div><button data-approve="${item.id}">Đã thanh toán</button><button data-reject="${item.id}">Từ chối</button></div>` : `<i>${withdrawalStatus(item.status)}</i>`}
          </article>`).join('') || '<p>Chưa có.</p>'}
      </section>
      <section class="card"><h3>Người dùng</h3>
        ${(users.users || []).map((item) => `<div class="row"><span>${e(item.profile?.display_name || 'Người chơi')}<small>${e(item.email || '')}</small></span><span><b>${f(item.wallet?.balance)} coin</b> <button data-adjust="${item.id}">±</button></span></div>`).join('')}
      </section>`

    view.querySelector('#admin-back').onclick = () => { state.tab = 'account'; renderApp() }
    view.querySelectorAll('[data-approve]').forEach((button) => { button.onclick = () => processWithdrawal(button.dataset.approve, 'approve') })
    view.querySelectorAll('[data-reject]').forEach((button) => { button.onclick = () => processWithdrawal(button.dataset.reject, 'reject') })
    view.querySelectorAll('[data-adjust]').forEach((button) => { button.onclick = () => adjustCoin(button.dataset.adjust) })
  } catch (error) {
    view.innerHTML = `<section class="card"><p>${e(friendly(error.message))}</p></section>`
  }
}

async function processWithdrawal(id, decision) {
  const note = prompt(decision === 'approve' ? 'Ghi chú thanh toán:' : 'Lý do từ chối:') || ''
  try {
    await adminApi('process_withdrawal', { withdrawal_id: id, decision, note })
    toast(decision === 'approve' ? 'Đã đánh dấu thanh toán.' : 'Đã từ chối và hoàn coin.', 'ok')
    await renderAdmin()
  } catch (error) {
    toast(friendly(error.message), 'bad')
  }
}

async function adjustCoin(userId) {
  const amount = Number(prompt('Nhập số coin (+ cộng, - trừ):'))
  if (!Number.isSafeInteger(amount) || amount === 0) return
  const note = prompt('Lý do điều chỉnh:') || ''
  try {
    await adminApi('adjust_coin', { user_id: userId, amount, note })
    toast('Đã điều chỉnh coin.', 'ok')
    await renderAdmin()
  } catch (error) {
    toast(friendly(error.message), 'bad')
  }
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
  const filled = state.block ? state.block.board.filter(Boolean).length : 0
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
  if (state.block) return
  root.innerHTML = '<main class="play-loading"><section><div class="loader"></div><p>Đang tạo phiên Block Blast...</p></section></main>'
  try {
    const response = await api('start_game', { game_id: 'block-blast' })
    state.block = {
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
    state.block.pieces = newPieceSet()
    renderBlockBlast()
  } catch (error) {
    state.block = null
    toast(friendly(error.message), 'bad')
    renderApp()
  }
}

function pieceHtml(piece, index) {
  const size = shapeSize(piece.shape)
  const blocks = piece.shape.map((point) => `<i data-color="${piece.color}" style="grid-row:${point[0] + 1};grid-column:${point[1] + 1}"></i>`).join('')
  return `<div class="play-slot"><div class="play-piece" data-piece="${index}" style="--rows:${size.rows};--cols:${size.cols}">${blocks}</div></div>`
}

function renderBlockBlast() {
  const b = state.block
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
      state.block = null
      renderApp()
    }
  }
  root.querySelectorAll('.play-piece').forEach(bindPieceDrag)
  if (isBlockGameOver()) setTimeout(finishBlockBlast, 350)
}

function canPlace(shape, row, col) {
  const b = state.block
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
  const b = state.block
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
  const drag = state.block?.drag
  if (drag?.ghost) drag.ghost.remove()
  clearPreview()
  if (state.block) state.block.drag = null
}

function bindPieceDrag(element) {
  element.onpointerdown = (event) => {
    const b = state.block
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
  const drag = state.block?.drag
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
  const drag = state.block?.drag
  if (!drag) return
  drag.ghost.remove()
  clearPreview()
  const original = document.querySelector(`[data-piece="${drag.index}"]`)
  if (original) original.classList.remove('dragging')
  state.block.drag = null
}

function dropDrag(event) {
  const drag = state.block?.drag
  if (!drag) return
  updateDrag(event)
  const valid = drag.valid
  const target = drag.target
  const index = drag.index
  drag.ghost.remove()
  clearPreview()
  state.block.drag = null
  if (valid && target) placePiece(index, target.row, target.col)
  else {
    const original = document.querySelector(`[data-piece="${index}"]`)
    if (original) original.classList.remove('dragging')
  }
}

function placePiece(index, row, col) {
  const b = state.block
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
  const b = state.block
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
    root.querySelector('#claim-game').onclick = async () => {
      state.block = null
      await load()
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
      state.block = null
      renderApp()
    }
  }
}

async function init() {
  root.innerHTML = '<div class="loader"></div>'
  try {
    const sessionResult = await supabase.auth.getSession()
    if (sessionResult.data.session) await load()
    else renderAuth()
  } catch (error) {
    root.innerHTML = `<main class="startup-error"><section><h2>Không thể khởi động Gamezcoin</h2><p>${e(friendly(error.message))}</p><button id="retry" class="primary">Tải lại</button></section></main>`
    root.querySelector('#retry').onclick = () => location.reload()
  }

  supabase.auth.onAuthStateChange(async (_event, session) => {
    if (!session) {
      state.data = null
      state.block = null
      renderAuth()
      return
    }
    if (!state.data) {
      try { await load() } catch (error) { toast(friendly(error.message), 'bad') }
    }
  })
}

init()
