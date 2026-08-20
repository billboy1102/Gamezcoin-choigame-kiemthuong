import './auth-freecash.css'
import { supabase } from './api.js'

const app = document.querySelector('#app')

const googleIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.23-.2-1.77H12v3.4h5.52a4.73 4.73 0 0 1-2.05 3.1l-.03.11 2.98 2.31.2.02c1.83-1.69 2.98-4.18 2.98-7.17Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.89 6.62-2.42l-3.15-2.44c-.84.57-1.95.98-3.47.98a6.02 6.02 0 0 1-5.7-4.16l-.1.01-3.1 2.4-.04.1A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.3 13.96A6.17 6.17 0 0 1 5.96 12c0-.68.12-1.34.33-1.96l-.01-.13-3.14-2.44-.1.05A10.05 10.05 0 0 0 2 12c0 1.61.38 3.13 1.05 4.48l3.25-2.52Z"/><path fill="#EA4335" d="M12 5.88c1.88 0 3.15.81 3.88 1.48l2.8-2.73C16.96 3.03 14.7 2 12 2a10 10 0 0 0-8.95 5.52l3.24 2.52A6.04 6.04 0 0 1 12 5.88Z"/></svg>`

const shieldIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 6v5.5c0 4.6-3.1 7.7-8 9.5-4.9-1.8-8-4.9-8-9.5V6l8-3Z"/><path d="m8.6 12 2.2 2.2 4.7-4.8"/></svg>`
const boltIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m13.4 2-8 11h6.3L10.6 22l8-11h-6.2L13.4 2Z"/></svg>`
const walletIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2h12"/><path d="M3 8h17M15.5 13.7H20"/></svg>`

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

function enhanceAuth() {
  const main = app?.querySelector('main.auth')
  if (!main || main.dataset.gcFreecashAuth === '1') return
  main.dataset.gcFreecashAuth = '1'

  const brand = main.querySelector('.brand')
  const box = main.querySelector('.authbox')
  if (!brand || !box) return

  const login = box.querySelector('[data-mode="login"]')?.classList.contains('on')
  brand.classList.add('gc-auth-brand')
  box.classList.add('gc-auth-panel')

  const brandText = brand.querySelector('div:last-child')
  if (brandText) {
    brandText.querySelector('p')?.remove()
    brandText.insertAdjacentHTML('beforeend', `
      <p class="gc-auth-brand-kicker">PLAY · EARN · REDEEM</p>
      <h2>Chơi game.<br><span>Nhận coin.</span><br>Rút thưởng.</h2>
      <p class="gc-auth-brand-copy">Một tài khoản Gamezcoin để chơi game, tích coin và theo dõi phần thưởng của bạn trên mọi thiết bị.</p>
      <div class="gc-auth-benefits">
        <span>${boltIcon}<b>Kiếm coin nhanh</b></span>
        <span>${shieldIcon}<b>Minh bạch & bảo mật</b></span>
        <span>${walletIcon}<b>Số dư đồng bộ</b></span>
      </div>`)
  }

  box.insertAdjacentHTML('afterbegin', `
    <div class="gc-auth-mobile-brand"><span>G</span><strong>Gamezcoin</strong></div>
    <header class="gc-auth-heading">
      <small>${login ? 'CHÀO MỪNG TRỞ LẠI' : 'THAM GIA GAMEZCOIN'}</small>
      <h1>${login ? 'Đăng nhập' : 'Tạo tài khoản miễn phí'}</h1>
      <p>${login ? 'Tiếp tục hành trình chơi game và kiếm coin của bạn.' : 'Tạo tài khoản trong vài giây và bắt đầu kiếm coin.'}</p>
    </header>`)

  const switcher = box.querySelector('.switch')
  switcher?.classList.add('gc-auth-switch')

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

  if (nameInput) {
    nameInput.placeholder = 'Tên hiển thị của bạn'
    nameInput.autocomplete = 'name'
  }
  if (emailInput) {
    emailInput.placeholder = 'name@example.com'
    emailInput.autocomplete = 'email'
    emailInput.inputMode = 'email'
  }
  if (passwordInput) {
    passwordInput.placeholder = 'Tối thiểu 6 ký tự'
    passwordInput.autocomplete = login ? 'current-password' : 'new-password'
  }
  if (refInput) {
    refInput.placeholder = 'Mã giới thiệu (nếu có)'
    refInput.autocomplete = 'off'
  }

  const passwordLabel = passwordInput?.closest('label')
  if (login && passwordLabel && !passwordLabel.querySelector('.gc-auth-forgot')) {
    const forgot = document.createElement('button')
    forgot.type = 'button'
    forgot.className = 'gc-auth-forgot'
    forgot.textContent = 'Quên mật khẩu?'
    forgot.addEventListener('click', () => resetPassword(box))
    passwordLabel.append(forgot)
  }

  const submit = form?.querySelector('button[type="submit"]')
  submit?.classList.add('gc-auth-submit')

  const oldNote = box.querySelector(':scope > small')
  oldNote?.remove()
  box.insertAdjacentHTML('beforeend', `
    <div class="gc-auth-bottom-link">
      <span>${login ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}</span>
      <button type="button" data-gc-auth-toggle>${login ? 'Đăng ký' : 'Đăng nhập'}</button>
    </div>
    <p class="gc-auth-terms">Bằng cách tiếp tục, bạn đồng ý với <b>Điều khoản sử dụng</b> và <b>Chính sách quyền riêng tư</b> của Gamezcoin.</p>
    <div class="gc-auth-security">${shieldIcon}<span>Tài khoản và số dư coin được lưu an toàn trên máy chủ.</span></div>`)

  box.querySelector('[data-gc-auth-toggle]')?.addEventListener('click', () => {
    box.querySelector(`[data-mode="${login ? 'signup' : 'login'}"]`)?.click()
  })
}

let queued = false
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
schedule()
