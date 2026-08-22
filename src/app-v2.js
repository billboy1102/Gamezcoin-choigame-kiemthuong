import './styles.css'
import './app-v2.css'
import './account-level.css'
import { supabase, api, adminApi } from './api.js'
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js'
import { getLanguage, translate } from './landing-i18n.js'
import { openWallet } from './wallet-adcash.js'
import { getAccountLevel } from './account-level.js'

const root = document.querySelector('#app')
const toasts = document.querySelector('#toast-root')
const language = getLanguage()
const t = (key, variables) => translate(key, variables, language)
const numberFmt = new Intl.NumberFormat(language === 'en' ? 'en-US' : 'vi-VN')
const state = { data: null, tab: 'games', mode: 'login', block: null }
let oauthProviderSettingsPromise = null

const f = (n) => numberFmt.format(Number(n || 0))
const e = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function authRedirectUrl() {
  const url = new URL(import.meta.env.BASE_URL, window.location.href)
  url.search = ''
  url.hash = ''
  return url.href
}

function isIOSDevice() {
  const userAgent = navigator.userAgent || ''
  const platform = navigator.platform || ''
  return /iPad|iPhone|iPod/i.test(userAgent) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

const oauthProviderNames = { google: 'Google', facebook: 'Facebook', apple: 'Apple' }

async function getOAuthProviderSettings() {
  if (!oauthProviderSettingsPromise) {
    oauthProviderSettingsPromise = fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY },
      cache: 'no-store'
    }).then(async (response) => {
      if (!response.ok) throw new Error('PROVIDER_SETTINGS_UNAVAILABLE')
      const settings = await response.json()
      return settings.external || {}
    }).catch((error) => {
      oauthProviderSettingsPromise = null
      throw error
    })
  }
  return oauthProviderSettingsPromise
}

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
    'Invalid login credentials': t('auth.invalidCredentials'),
    'Email not confirmed': t('auth.emailNotConfirmed'),
    'provider is not enabled': t('auth.socialUnavailable'),
    TOO_FAST: 'Phiên chơi quá nhanh nên không được cộng coin.',
    IMPOSSIBLE_SCORE: 'Điểm vượt ngưỡng hợp lý nên bị từ chối.',
    SESSION_EXPIRED: 'Phiên chơi đã hết hạn.',
    SESSION_ALREADY_FINISHED: 'Phiên này đã được xử lý.',
    BELOW_MIN_WITHDRAWAL: 'Chưa đạt mức rút tối thiểu.',
    INSUFFICIENT_BALANCE: 'Số dư coin không đủ.',
    TOO_MANY_SESSIONS: 'Bạn đang mở quá nhiều phiên game.',
    SERVER_TIMEOUT: 'Máy chủ phản hồi quá lâu. Hãy thử lại.'
  }
  return map[message] || message || t('auth.genericError')
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
        <div><h1>Gamezcoin</h1><p>${t('auth.brandTagline')}</p></div>
      </section>
      <section class="card authbox">
        <div class="switch">
          <button data-mode="login" class="${login ? 'on' : ''}">${t('common.signIn')}</button>
          <button data-mode="signup" class="${login ? '' : 'on'}">${t('common.signUp')}</button>
        </div>
        <form id="auth-form">
          ${login ? '' : `<label>${t('auth.displayName')}<input name="name" minlength="2" maxlength="40" required></label>`}
          <label>${t('auth.email')}<input name="email" type="email" required></label>
          <label>${t('auth.password')}<input name="password" type="password" minlength="6" required></label>
          ${login ? '' : `<label>${t('auth.referral')}<input name="ref" maxlength="16"></label>`}
          <button class="primary" type="submit">${login ? t('common.signIn') : t('auth.createAccount')}</button>
        </form>
        <div class="auth-social" data-auth-social>
          <button type="button" id="google-login" class="google" data-oauth-provider="google">${t('auth.continueGoogle')}</button>
          <button type="button" id="facebook-login" data-oauth-provider="facebook">${t('auth.continueFacebook')}</button>
          ${isIOSDevice() ? `<button type="button" id="apple-login" data-oauth-provider="apple">${t('auth.continueApple')}</button>` : ''}
        </div>
        <small>${t('auth.serverNote')}</small>
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
          toast(t('auth.signupConfirmation'), 'ok')
          state.mode = 'login'
          renderAuth()
        }
      }
    } catch (error) {
      toast(friendly(error.message), 'bad')
    }
  }

  root.querySelectorAll('[data-oauth-provider]').forEach((button) => {
    button.onclick = async () => {
      const provider = button.dataset.oauthProvider
      const providerName = oauthProviderNames[provider] || provider
      button.disabled = true
      button.setAttribute('aria-busy', 'true')
      try {
        let providerSettings
        try {
          providerSettings = await getOAuthProviderSettings()
        } catch {
          const error = new Error('PROVIDER_SETTINGS_UNAVAILABLE')
          error.code = 'PROVIDER_SETTINGS_UNAVAILABLE'
          throw error
        }
        if (providerSettings[provider] !== true) {
          const error = new Error('provider is not enabled')
          error.code = 'PROVIDER_DISABLED'
          throw error
        }
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo: authRedirectUrl() }
        })
        if (error) throw error
      } catch (error) {
        const message = error?.code === 'PROVIDER_SETTINGS_UNAVAILABLE'
          ? t('auth.providerCheckFailed')
          : error?.code === 'PROVIDER_DISABLED' || /provider is not enabled/i.test(error?.message || '')
            ? t('auth.providerUnavailable', { provider: providerName })
            : friendly(error?.message)
        window.dispatchEvent(new CustomEvent('gamezcoin:oauth-error', { detail: { provider, message } }))
        toast(message, 'bad')
        button.disabled = false
        button.removeAttribute('aria-busy')
      }
    }
  })
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

function renderWallet() {
  const view = root.querySelector('#view')
  openWallet(view)
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
  const totalEarned = Number(d.wallet?.lifetime_earned || 0)
  const currentBalance = Number(d.wallet?.balance || 0)
  const level = getAccountLevel(totalEarned)
  const levelProgress = level.progress.toFixed(2)
  const copy = language === 'en' ? {
    title: 'MY PROFILE',
    verified: 'Verified account',
    player: 'Player',
    totalRevenue: 'Total revenue',
    currentBalance: 'Current balance',
    level: 'Level',
    remaining: (coin, nextLevel) => `${coin} coin to reach level ${nextLevel}`,
    currentMilestone: 'Current milestone',
    nextMilestone: 'Next milestone',
    accountInfo: 'Account information',
    displayName: 'Display name',
    saveName: 'Save name',
    admin: 'Admin panel',
    logout: 'Sign out',
    saved: 'Saved.'
  } : {
    title: 'HỒ SƠ CỦA TÔI',
    verified: 'Tài khoản đã xác thực',
    player: 'Người chơi',
    totalRevenue: 'Tổng doanh thu',
    currentBalance: 'Số dư hiện tại',
    level: 'Cấp độ',
    remaining: (coin, nextLevel) => `Còn ${coin} coin để lên cấp ${nextLevel}`,
    currentMilestone: 'Mốc hiện tại',
    nextMilestone: 'Mốc tiếp theo',
    accountInfo: 'Thông tin tài khoản',
    displayName: 'Tên hiển thị',
    saveName: 'Lưu tên',
    admin: 'Trang quản trị',
    logout: 'Đăng xuất',
    saved: 'Đã lưu.'
  }
  const displayName = d.profile?.display_name || copy.player
  view.innerHTML = `
    <div class="gc-account-page">
      <section class="gc-account-overview">
        <div class="gc-account-heading">
          <span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>
            ${copy.title}
          </span>
          <small>${copy.verified}</small>
        </div>
        <div class="gc-account-main">
          <div class="gc-account-identity">
            <div class="avatar">${e(displayName[0])}</div>
            <div>
              <h1>${e(displayName)}</h1>
              <p>${e(d.user?.email || '')}</p>
              ${d.is_admin ? '<b class="adminbadge">ADMIN</b>' : ''}
            </div>
          </div>
          <div class="gc-account-stats">
            <article class="gc-account-stat">
              <small>
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M15 9.5c-.7-.7-1.7-1-3-1-1.7 0-3 .8-3 2s1.1 1.8 3 2c1.9.2 3 1 3 2.2 0 1.3-1.3 2.2-3 2.2-1.3 0-2.5-.4-3.2-1.2M12 6.5v11"/></svg>
                ${copy.totalRevenue}
              </small>
              <strong>${f(totalEarned)} <em>coin</em></strong>
            </article>
            <article class="gc-account-stat">
              <small>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5h14a2 2 0 0 1 2 2V18H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h13"/><path d="M16 11h6v4h-6a2 2 0 1 1 0-4Z"/></svg>
                ${copy.currentBalance}
              </small>
              <strong>${f(currentBalance)} <em>coin</em></strong>
            </article>
          </div>
        </div>
        <div class="gc-account-level">
          <div class="gc-account-level-head">
            <strong>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.6 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.2l6.2-.9Z"/></svg>
              ${copy.level} <span>${level.level}</span>
            </strong>
            <small>${copy.remaining(f(level.remaining), level.level + 1)}</small>
          </div>
          <div class="gc-account-progress" role="progressbar" aria-label="${e(copy.level)} ${level.level}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(level.progress)}">
            <span style="width:${levelProgress}%"></span>
          </div>
          <div class="gc-account-level-foot">
            <span>${copy.currentMilestone}: ${f(level.currentThreshold)} coin</span>
            <span>${copy.nextMilestone}: ${f(level.nextThreshold)} coin</span>
          </div>
        </div>
      </section>
      <section class="card gc-account-settings">
        <h3>${copy.accountInfo}</h3>
      <form id="profile-form">
          <label>${copy.displayName}<input name="name" value="${e(d.profile?.display_name || '')}" minlength="2" maxlength="40" required></label>
          <button class="secondary">${copy.saveName}</button>
        </form>
      </section>
      <div class="gc-account-actions">
        ${d.is_admin ? `<button id="admin-button" class="adminbtn">🛡️ ${copy.admin}</button>` : ''}
        <button id="logout-button" class="danger">${copy.logout}</button>
      </div>
    </div>`

  view.querySelector('#profile-form').onsubmit = async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      await api('update_profile', { display_name: form.get('name') })
      await load()
      toast(copy.saved, 'ok')
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
    if (state.data?.wallet) {
      state.data.wallet.balance = Number(state.data.wallet.balance || 0) + coin + referral
      state.data.wallet.lifetime_earned = Number(state.data.wallet.lifetime_earned || 0) + coin + referral
    }
    root.innerHTML = `
      <main class="play-result">
        <section class="play-result-card">
          <div class="play-result-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg></div>
          <h2>Hoàn thành ván</h2>
          <div class="play-result-metrics">
            <div><small>ĐIỂM</small><strong>${f(finalScore)}</strong></div>
            <div class="coin-metric"><small>COIN NHẬN ĐƯỢC</small><strong>+${f(coin)}</strong></div>
          </div>
          <p class="play-result-meta">${b.lines} hàng/cột · combo tốt nhất x${Math.max(1, b.bestCombo)}</p>
          ${referral ? `<p class="play-result-referral">Thưởng giới thiệu +${f(referral)} coin</p>` : ''}
          <button id="next-block-game" type="button" class="play-replay-button" aria-label="Chơi ván mới"><svg viewBox="0 0 24 24"><path d="M20 7v5h-5"/><path d="M19 12a7 7 0 1 1-2.05-4.95L20 10"/></svg></button>
          <span class="play-replay-label">Chơi ván mới</span>
        </section>
      </main>`
    root.querySelector('#next-block-game').onclick = (event) => {
      event.currentTarget.disabled = true
      state.block = null
      startBlockBlast()
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
