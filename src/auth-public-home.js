import './auth-public-home.css'
import { supabase } from './api.js'

const app = document.querySelector('#app')
let requestedMode = null
let queued = false

const googleIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.23-.2-1.77H12v3.4h5.52a4.73 4.73 0 0 1-2.05 3.1l-.03.11 2.98 2.31.2.02c1.83-1.69 2.98-4.18 2.98-7.17Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.89 6.62-2.42l-3.15-2.44c-.84.57-1.95.98-3.47.98a6.02 6.02 0 0 1-5.7-4.16l-.1.01-3.1 2.4-.04.1A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.3 13.96A6.17 6.17 0 0 1 5.96 12c0-.68.12-1.34.33-1.96l-.01-.13-3.14-2.44-.1.05A10.05 10.05 0 0 0 2 12c0 1.61.38 3.13 1.05 4.48l3.25-2.52Z"/><path fill="#EA4335" d="M12 5.88c1.88 0 3.15.81 3.88 1.48l2.8-2.73C16.96 3.03 14.7 2 12 2a10 10 0 0 0-8.95 5.52l3.24 2.52A6.04 6.04 0 0 1 12 5.88Z"/></svg>`
const globeIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 2.6 4.2 5.6 4.2 9S14.8 18.4 12 21c-2.8-2.6-4.2-5.6-4.2-9S9.2 5.6 12 3Z"/></svg>`
const shieldIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 6v5.5c0 4.6-3.1 7.7-8 9.5-4.9-1.8-8-4.9-8-9.5V6l8-3Z"/><path d="m8.6 12 2.2 2.2 4.7-4.8"/></svg>`
const gameIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 8h9a5 5 0 0 1 4.8 6.4l-.8 2.6a2.6 2.6 0 0 1-4.1 1.3l-2.2-1.8H9.8l-2.2 1.8A2.6 2.6 0 0 1 3.5 17l-.8-2.6A5 5 0 0 1 7.5 8Z"/><path d="M7 12v4M5 14h4M16.5 12.8h.01M19 15h.01"/></svg>`
const walletIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2h12"/><path d="M3 8h17M15.5 13.7H20"/></svg>`
const checkIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>`
const arrowIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>`
const closeIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>`

function setAuthMessage(box, message, kind = '') {
  let node = box.querySelector('.gc-auth-message')
  if (!node) {
    node = document.createElement('div')
    node.className = 'gc-auth-message'
    box.querySelector('#auth-form')?.insertAdjacentElement('beforebegin', node)
  }
  node.className = `gc-auth-message ${kind}`
  node.textContent = message
}

async function resetPassword(box) {
  const email = String(box.querySelector('input[name="email"]')?.value || '').trim()
  if (!email) {
    setAuthMessage(box, 'Nhập email của bạn trước để đặt lại mật khẩu.', 'bad')
    box.querySelector('input[name="email"]')?.focus()
    return
  }
  setAuthMessage(box, 'Đang gửi liên kết đặt lại mật khẩu…')
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: location.origin + location.pathname,
  })
  if (error) {
    setAuthMessage(box, error.message || 'Không thể gửi email đặt lại mật khẩu.', 'bad')
    return
  }
  setAuthMessage(box, 'Đã gửi liên kết đặt lại mật khẩu vào email của bạn.', 'ok')
}

function landingMarkup() {
  return `<div class="gc-public-home">
    <header class="gc-public-header">
      <div class="gc-public-logo" aria-label="Gamezcoin"><span>G</span><strong>Gamezcoin</strong></div>
      <div class="gc-public-header-actions">
        <span class="gc-public-language" title="Tiếng Việt">${globeIcon}<small>VI</small></span>
        <button type="button" class="gc-public-signin" data-public-auth="login">Đăng nhập</button>
        <button type="button" class="gc-public-signup" data-public-auth="signup">Đăng ký</button>
      </div>
    </header>

    <section class="gc-public-hero">
      <div class="gc-public-hero-shade"></div>
      <div class="gc-public-hero-copy">
        <span class="gc-public-eyebrow"><i></i> GAMEZCOIN · PLAY TO EARN</span>
        <h1><em>Chơi game</em>, nhận coin<br>và đổi thưởng</h1>
        <p>Chơi các game giải trí, hoàn thành nhiệm vụ hằng ngày và tích coin vào ví Gamezcoin của bạn.</p>
        <div class="gc-public-hero-meta">
          <span><b>2</b> game đang có</span>
          <span><i></i> Coin lưu trên server</span>
        </div>
        <div class="gc-public-hero-cta">
          <button type="button" data-public-auth="signup">Bắt đầu kiếm coin ${arrowIcon}</button>
          <button type="button" class="secondary" data-public-auth="login">Tôi đã có tài khoản</button>
        </div>
      </div>
      <div class="gc-public-hero-art" aria-hidden="true">
        <div class="gc-public-glow"></div>
        <img src="/assets/rewards-controller-exact.svg" alt="">
        <div class="gc-public-float-card"><span>G</span><div><small>Ví Gamezcoin</small><b>Coin của bạn</b></div></div>
      </div>
    </section>

    <section class="gc-public-offers" aria-label="Cách kiếm coin nổi bật">
      <article class="gc-public-offer-card">
        <div class="gc-offer-art gc-block-art" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
        <div class="gc-offer-copy"><strong>Block Blast</strong><span>Chơi & kiếm coin</span><small>10 điểm = 1 coin</small></div>
      </article>
      <article class="gc-public-offer-card">
        <div class="gc-offer-art gc-orbit-art"><img src="/orbit-break-logo.jpg" alt="Orbit Break"></div>
        <div class="gc-offer-copy"><strong>Orbit Break</strong><span>Chơi & kiếm coin</span><small>10 điểm = 1 coin</small></div>
      </article>
      <article class="gc-public-offer-card">
        <div class="gc-offer-art gc-task-art" aria-hidden="true">${checkIcon}</div>
        <div class="gc-offer-copy"><strong>Nhiệm vụ hằng ngày</strong><span>Chơi · chia sẻ · nhận thưởng</span><small>Nhận thêm coin mỗi ngày</small></div>
      </article>
    </section>

    <section class="gc-public-trust">
      <p>Nền tảng Gamezcoin được thiết kế để theo dõi phần thưởng rõ ràng</p>
      <div>
        <span>${shieldIcon}<b>Minh bạch</b><small>Lịch sử coin được ghi nhận</small></span>
        <span>${walletIcon}<b>Ví đồng bộ</b><small>Dùng chung trên nhiều thiết bị</small></span>
        <span>${gameIcon}<b>Game thật</b><small>Hoàn thành ván mới tính nhiệm vụ</small></span>
      </div>
    </section>

    <section class="gc-public-how">
      <div class="gc-public-section-title"><small>BẮT ĐẦU RẤT NHANH</small><h2>Kiếm coin với Gamezcoin như thế nào?</h2></div>
      <div class="gc-public-steps">
        <article><b>1</b><div><strong>Tạo tài khoản</strong><p>Đăng ký miễn phí bằng email hoặc tiếp tục với Google.</p></div></article>
        <article><b>2</b><div><strong>Chơi game & làm nhiệm vụ</strong><p>Chọn game, hoàn thành ván chơi hợp lệ hoặc nhiệm vụ trong ngày.</p></div></article>
        <article><b>3</b><div><strong>Nhận coin vào ví</strong><p>Theo dõi số dư và gửi yêu cầu rút thưởng khi đạt điều kiện.</p></div></article>
      </div>
    </section>

    <section class="gc-public-earn-types">
      <div class="gc-public-section-title"><small>NHIỀU CÁCH NHẬN THƯỞNG</small><h2>Chơi, hoàn thành nhiệm vụ và mời bạn bè</h2></div>
      <div class="gc-public-earn-grid">
        <article><span>${gameIcon}</span><h3>Chơi game</h3><p>Block Blast và Orbit Break với hệ thống phiên chơi được xác minh.</p></article>
        <article><span>${checkIcon}</span><h3>Nhiệm vụ hôm nay</h3><p>Hoàn thành mục tiêu trong ngày để nhận thêm coin.</p></article>
        <article><span>${walletIcon}</span><h3>Giới thiệu bạn bè</h3><p>Mời bạn bè tham gia Gamezcoin và nhận thưởng theo chương trình.</p></article>
      </div>
    </section>

    <section class="gc-public-final-cta">
      <div><small>SẴN SÀNG CHƠI?</small><h2>Bắt đầu hành trình kiếm coin ngay</h2><p>Tạo tài khoản Gamezcoin và khám phá các game cùng nhiệm vụ hiện có.</p></div>
      <button type="button" data-public-auth="signup">Đăng ký miễn phí ${arrowIcon}</button>
    </section>

    <footer class="gc-public-footer"><span class="gc-public-footer-logo"><i>G</i><b>Gamezcoin</b></span><small>Chơi game · Kiếm thưởng · Quản lý coin trong một tài khoản.</small></footer>

    <nav class="gc-public-bottom-nav" aria-label="Điều hướng khách">
      <button type="button" class="on" data-public-home><span>⌂</span><small>Trang chủ</small></button>
      <button type="button" data-public-auth="login"><span>◈</span><small>Rút thưởng</small></button>
    </nav>
  </div>`
}

function decorateAuthBox(box, login) {
  box.classList.add('gc-public-auth-panel')
  box.insertAdjacentHTML('afterbegin', `
    <button type="button" class="gc-auth-close" aria-label="Đóng">${closeIcon}</button>
    <div class="gc-auth-mobile-brand"><span>G</span><strong>Gamezcoin</strong></div>
    <header class="gc-auth-heading">
      <small>${login ? 'CHÀO MỪNG TRỞ LẠI' : 'THAM GIA GAMEZCOIN'}</small>
      <h1>${login ? 'Đăng nhập' : 'Tạo tài khoản miễn phí'}</h1>
      <p>${login ? 'Tiếp tục chơi game, làm nhiệm vụ và quản lý coin của bạn.' : 'Tạo tài khoản trong vài giây để bắt đầu chơi và kiếm coin.'}</p>
    </header>`)

  const switcher = box.querySelector('.switch')
  switcher?.classList.add('gc-auth-switch')
  switcher?.querySelectorAll('[data-mode]').forEach((button) => {
    button.addEventListener('click', () => { requestedMode = button.dataset.mode }, true)
  })

  const google = box.querySelector('#google-login')
  const form = box.querySelector('#auth-form')
  if (google && form) {
    google.classList.add('gc-auth-google')
    google.innerHTML = `${googleIcon}<span>Tiếp tục với Google</span>`
    switcher?.insertAdjacentElement('afterend', google)
    google.insertAdjacentHTML('afterend', '<div class="gc-auth-divider"><span>HOẶC</span></div>')
  }

  form?.classList.add('gc-auth-form')
  box.querySelectorAll('label').forEach((label) => label.classList.add('gc-auth-field'))

  const nameInput = box.querySelector('input[name="name"]')
  const emailInput = box.querySelector('input[name="email"]')
  const passwordInput = box.querySelector('input[name="password"]')
  const refInput = box.querySelector('input[name="ref"]')

  if (nameInput) { nameInput.placeholder = 'Tên hiển thị của bạn'; nameInput.autocomplete = 'name' }
  if (emailInput) { emailInput.placeholder = 'name@example.com'; emailInput.autocomplete = 'email'; emailInput.inputMode = 'email' }
  if (passwordInput) { passwordInput.placeholder = 'Tối thiểu 6 ký tự'; passwordInput.autocomplete = login ? 'current-password' : 'new-password' }
  if (refInput) { refInput.placeholder = 'Mã giới thiệu (nếu có)'; refInput.autocomplete = 'off' }

  const passwordLabel = passwordInput?.closest('label')
  if (login && passwordLabel) {
    const forgot = document.createElement('button')
    forgot.type = 'button'
    forgot.className = 'gc-auth-forgot'
    forgot.textContent = 'Quên mật khẩu?'
    forgot.addEventListener('click', () => resetPassword(box))
    passwordLabel.append(forgot)
  }

  form?.querySelector('button[type="submit"]')?.classList.add('gc-auth-submit')
  box.querySelector(':scope > small')?.remove()
  box.insertAdjacentHTML('beforeend', `
    <div class="gc-auth-bottom-link"><span>${login ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}</span><button type="button" data-gc-auth-toggle>${login ? 'Đăng ký' : 'Đăng nhập'}</button></div>
    <p class="gc-auth-terms">Bằng cách tiếp tục, bạn đồng ý với Điều khoản sử dụng và Chính sách quyền riêng tư của Gamezcoin.</p>
    <div class="gc-auth-security">${shieldIcon}<span>Tài khoản và số dư coin được lưu trên máy chủ.</span></div>`)

  box.querySelector('[data-gc-auth-toggle]')?.addEventListener('click', () => {
    const mode = login ? 'signup' : 'login'
    requestedMode = mode
    box.querySelector(`[data-mode="${mode}"]`)?.click()
  })
}

function closeAuth(main) {
  requestedMode = null
  main.querySelector('.gc-auth-overlay')?.classList.remove('open')
  document.body.classList.remove('gc-auth-modal-open')
}

function openAuth(main, box, mode = 'signup') {
  requestedMode = mode
  const modeButton = box.querySelector(`[data-mode="${mode}"]`)
  if (modeButton && !modeButton.classList.contains('on')) {
    modeButton.click()
    return
  }
  main.querySelector('.gc-auth-overlay')?.classList.add('open')
  document.body.classList.add('gc-auth-modal-open')
  requestAnimationFrame(() => box.querySelector('input')?.focus({ preventScroll: true }))
}

function enhanceAuth() {
  const main = app?.querySelector('main.auth')
  if (!main || main.dataset.gcPublicAuth === '1') return
  main.dataset.gcPublicAuth = '1'
  main.classList.add('gc-public-auth')

  const brand = main.querySelector('.brand')
  const box = main.querySelector('.authbox')
  if (!box) return
  const login = box.querySelector('[data-mode="login"]')?.classList.contains('on')
  const currentMode = login ? 'login' : 'signup'

  if (requestedMode && requestedMode !== currentMode) {
    box.querySelector(`[data-mode="${requestedMode}"]`)?.click()
    return
  }

  decorateAuthBox(box, login)
  brand?.remove()

  const landing = document.createElement('div')
  landing.innerHTML = landingMarkup()
  const publicHome = landing.firstElementChild

  const overlay = document.createElement('div')
  overlay.className = 'gc-auth-overlay'
  overlay.append(box)
  main.replaceChildren(publicHome, overlay)

  main.querySelectorAll('[data-public-auth]').forEach((button) => {
    button.addEventListener('click', () => openAuth(main, box, button.dataset.publicAuth || 'signup'))
  })
  main.querySelector('[data-public-home]')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }))
  box.querySelector('.gc-auth-close')?.addEventListener('click', () => closeAuth(main))
  overlay.addEventListener('click', (event) => { if (event.target === overlay) closeAuth(main) })

  if (requestedMode) openAuth(main, box, requestedMode)
}

function schedule() {
  if (queued) return
  queued = true
  queueMicrotask(() => {
    queued = false
    enhanceAuth()
  })
}

new MutationObserver(schedule).observe(app || document.documentElement, { childList: true, subtree: true })
window.addEventListener('pageshow', schedule)
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return
  const main = app?.querySelector('main.auth.gc-public-auth')
  if (main?.querySelector('.gc-auth-overlay.open')) closeAuth(main)
})
schedule()
