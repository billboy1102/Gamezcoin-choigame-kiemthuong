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
  // The premium home renderer in home-reference.js is the only Home UI now.
  // Keep this view empty so the removed legacy Home can never flash before
  // the premium renderer finishes hydrating its own content.
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
    <section class="card"><h3>Lịch sử rút</h3>${(d.withdrawals || []).map((item) => `<div class="row"><span>${f(item.coin_amount)} coin<small>${new Date(item.created_at).toLocaleString('vi-VN')}</small></span><b class="${item.status}">${withdrawalStatus(item.status)}</b></div>`).join('') || '<p>Chưa có yêu cầu.</p>'}</section>
    <section class="card"><h3>Biến động coin</h3>${(d.ledger || []).map((item) => `<div class="row"><span>${e(item.description)}<small>${new Date(item.created_at).toLocaleString('vi-VN')}</small></span><b class="${Number(item.amount) > 0 ? 'plus' : 'minus'}">${Number(item.amount) > 0 ? '+' : ''}${f(item.amount)}</b></div>`).join('') || '<p>Chưa có giao dịch.</p>'}</section>`

  view.querySelector('#withdraw-form').onsubmit = async (event) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    try {
      await api('withdraw', {
        coin_amount: Number(data.get('amount')),
        method: data.get('method'),
        account_name: data.get('name'),
        account_number: data.get('number'),
        bank_name: data.get('bank')
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
      <small>Thưởng sau phiên game hợp lệ đầu tiên của tài khoản được mời.</small>
    </section>`
  view.querySelector('#copy-ref').onclick = async () => {
    await navigator.clipboard?.writeText(code)
    toast('Đã sao chép.', 'ok')
  }
}

function renderAccount() {
  const d = state.data
  const view = root.querySelector('#view')
  view.innerHTML = `
    <section class="card center">
      <div class="avatar">${e((d.profile?.display_name || 'G')[0])}</div>
      <h2>${e(d.profile?.display_name)}</h2>
      <p>${e(d.user?.email)}</p>
      ${d.is_admin ? '<b class="adminbadge">ADMIN</b>' : ''}
    </section>
    <section class="card"><form id="profile-form"><label>Tên hiển thị<input name="name" value="${e(d.profile?.display_name)}" minlength="2" maxlength="40" required></label><button class="secondary">Lưu tên</button></form></section>
    ${d.is_admin ? '<button id="admin" class="adminbtn">🛡️ Trang quản trị</button>' : ''}
    <button id="logout" class="danger">Đăng xuất</button>`

  view.querySelector('#profile-form').onsubmit = async (event) => {
    event.preventDefault()
    try {
      await api('update_profile', { display_name: new FormData(event.currentTarget).get('name') })
      await load()
      toast('Đã lưu.', 'ok')
    } catch (error) {
      toast(friendly(error.message), 'bad')
    }
  }
  view.querySelector('#logout').onclick = () => supabase.auth.signOut()
  view.querySelector('#admin')?.addEventListener('click', renderAdmin)
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
      <button id="back" class="secondary">← Quay lại</button>
      <h2>Quản trị Gamezcoin</h2>
      <div class="stats">
        <div>Người dùng<b>${f(overview.users)}</b></div>
        <div>Coin đã phát<b>${f(overview.total_earned)}</b></div>
        <div>Đang lưu hành<b>${f(overview.total_balance)}</b></div>
        <div>Chờ rút<b>${f(overview.pending_withdrawals)}</b></div>
      </div>
      <section class="card"><h3>Người dùng</h3>${(users.users || []).map((user) => `<div class="row"><span>${e(user.display_name || user.email)}<small>${e(user.email)}</small></span><b>${f(user.balance)} coin</b></div>`).join('') || '<p>Chưa có người dùng.</p>'}</section>
      <section class="card"><h3>Yêu cầu rút</h3>${(withdrawals.withdrawals || []).map((item) => `<div class="row"><span>${e(item.email || item.account_name || '')}<small>${f(item.coin_amount)} coin · ${withdrawalStatus(item.status)}</small></span>${item.status === 'pending' ? `<span><button class="secondary" data-pay="${e(item.id)}">Đã trả</button><button class="danger" data-reject="${e(item.id)}">Từ chối</button></span>` : ''}</div>`).join('') || '<p>Chưa có yêu cầu.</p>'}</section>`
    view.querySelector('#back').onclick = () => renderAccount()
    view.querySelectorAll('[data-pay]').forEach((button) => {
      button.onclick = async () => {
        try {
          await adminApi('withdrawal_update', { withdrawal_id: button.dataset.pay, status: 'paid' })
          toast('Đã đánh dấu thanh toán.', 'ok')
          renderAdmin()
        } catch (error) {
          toast(friendly(error.message), 'bad')
        }
      }
    })
    view.querySelectorAll('[data-reject]').forEach((button) => {
      button.onclick = async () => {
        try {
          await adminApi('withdrawal_update', { withdrawal_id: button.dataset.reject, status: 'rejected' })
          toast('Đã từ chối và hoàn coin.', 'ok')
          renderAdmin()
        } catch (error) {
          toast(friendly(error.message), 'bad')
        }
      }
    })
  } catch (error) {
    toast(friendly(error.message), 'bad')
    renderAccount()
  }
}

async function startBlockBlast() {
  const game = (state.data.games || []).find((item) => item.id === 'block-blast')
  if (!game) {
    toast('Block Blast đang tạm thời chưa được bật.', 'bad')
    return
  }
  state.block = { game }
  window.dispatchEvent(new CustomEvent('gamezcoin:block-blast:start', { detail: { game } }))
}

supabase.auth.onAuthStateChange((_event, session) => {
  if (!session) {
    state.data = null
    renderAuth()
    return
  }
  setTimeout(() => load().catch((error) => toast(friendly(error.message), 'bad')), 0)
})

supabase.auth.getSession().then(({ data }) => {
  if (data.session) load().catch((error) => toast(friendly(error.message), 'bad'))
  else renderAuth()
})
