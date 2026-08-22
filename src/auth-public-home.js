import './auth-public-home.css'
import './landing-how-professional.css'
import './landing-trust-reference.css'
import './landing-mobile-actions.css'
import './landing-hero-metrics.css'
import './landing-faq-final-cta.css'
import { finalBannerImageUrl } from './final-cta-reference.js'
import { supabase } from './api.js'

const app = document.querySelector('#app')
let requestedMode = null
let queued = false

const gameArtUrl = (file) => `${import.meta.env.BASE_URL}assets/games/${file}`
const paymentAssetUrl = (file) => `${import.meta.env.BASE_URL}assets/payments/${file}`

const googleIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.23-.2-1.77H12v3.4h5.52a4.73 4.73 0 0 1-2.05 3.1l-.03.11 2.98 2.31.2.02c1.83-1.69 2.98-4.18 2.98-7.17Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.89 6.62-2.42l-3.15-2.44c-.84.57-1.95.98-3.47.98a6.02 6.02 0 0 1-5.7-4.16l-.1.01-3.1 2.4-.04.1A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.3 13.96A6.17 6.17 0 0 1 5.96 12c0-.68.12-1.34.33-1.96l-.01-.13-3.14-2.44-.1.05A10.05 10.05 0 0 0 2 12c0 1.61.38 3.13 1.05 4.48l3.25-2.52Z"/><path fill="#EA4335" d="M12 5.88c1.88 0 3.15.81 3.88 1.48l2.8-2.73C16.96 3.03 14.7 2 12 2a10 10 0 0 0-8.95 5.52l3.24 2.52A6.04 6.04 0 0 1 12 5.88Z"/></svg>`
const globeIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 2.6 4.2 5.6 4.2 9S14.8 18.4 12 21c-2.8-2.6-4.2-5.6-4.2-9S9.2 5.6 12 3Z"/></svg>`
const shieldIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 6v5.5c0 4.6-3.1 7.7-8 9.5-4.9-1.8-8-4.9-8-9.5V6l8-3Z"/><path d="m8.6 12 2.2 2.2 4.7-4.8"/></svg>`
const gameIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 8h9a5 5 0 0 1 4.8 6.4l-.8 2.6a2.6 2.6 0 0 1-4.1 1.3l-2.2-1.8H9.8l-2.2 1.8A2.6 2.6 0 0 1 3.5 17l-.8-2.6A5 5 0 0 1 7.5 8Z"/><path d="M7 12v4M5 14h4M16.5 12.8h.01M19 15h.01"/></svg>`
const walletIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2h12"/><path d="M3 8h17M15.5 13.7H20"/></svg>`
const checkIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>`
const boltIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m13.5 2-8 11h6.1L10.5 22l8-11h-6.1L13.5 2Z"/></svg>`
const lockIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></svg>`
const arrowIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>`
const closeIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>`
const homeNavIcon = `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M7 22.5 24 7l17 15.5"/><path d="M11 20.5V41h10V29h6v12h10V20.5"/></svg>`
const cashoutNavIcon = `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 9h32v9H8z"/><path d="M14 18v21h20V18"/><rect x="18" y="22" width="12" height="12" rx="2"/><path d="M24 24.5v7M27 26h-4.2a1.8 1.8 0 0 0 0 3.6H27"/></svg>`
const usersMetricIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="gc-users-gradient" x1="3" y1="4" x2="21" y2="20" gradientUnits="userSpaceOnUse"><stop stop-color="#21c8ff"/><stop offset=".55" stop-color="#3978ff"/><stop offset="1" stop-color="#8b42ff"/></linearGradient></defs><circle cx="8.2" cy="7.8" r="3.1"/><circle cx="16.5" cy="8.7" r="2.5" opacity=".78"/><path d="M2.7 18.5c.35-4 2.4-6.1 5.6-6.1 3.25 0 5.3 2.1 5.65 6.1.08.9-.58 1.6-1.45 1.6H4.15c-.87 0-1.53-.7-1.45-1.6Z"/><path d="M13.4 13.1c.8-.62 1.85-.95 3.1-.95 2.75 0 4.55 1.85 4.82 5.35.08.86-.56 1.55-1.4 1.55h-4.35c-.05-2.35-.78-4.35-2.17-5.95Z" opacity=".78"/></svg>`

const virtualGames = [
  ['Galaxy Match', 'planet', 'galaxy-match-3d.webp', '250.000đ'],
  ['Fruit Craze', 'fruit', 'fruit-craze-3d.webp', '235.000đ'],
  ['Jewel Quest', 'jewel', 'jewel-quest-3d.webp', '245.000đ'],
  ['Candy Merge', 'candy', 'candy-merge-3d.webp', '220.000đ'],
  ['Bubble Pop', 'bubble', 'bubble-pop-3d.webp', '205.000đ'],
  ['Zombie Dash', 'zombie', 'zombie-dash-3d.webp', '240.000đ'],
  ['Farm Puzzle', 'farm', 'farm-puzzle-3d.webp', '215.000đ'],
  ['Speed Runner', 'runner', 'speed-runner-3d.webp', '230.000đ'],
  ['Pixel Shooter', 'space', 'pixel-shooter-3d.webp', '225.000đ'],
  ['Dragon Merge', 'dragon', 'dragon-merge-3d.webp', '248.000đ'],
  ['Lucky Spin', 'spin', 'lucky-spin-3d.webp', '210.000đ'],
  ['Merge Town', 'town', 'merge-town-3d.webp', '238.000đ'],
]

function virtualGameCards() {
  return virtualGames.map(([name, art, image, amount]) => `
    <article class="gc-virtual-game">
      <div class="gc-virtual-art gc-art-${art}" data-professional-art="1">
        <img src="${gameArtUrl(image)}" alt="" width="960" height="540" loading="lazy" decoding="async" draggable="false">
      </div>
      <div class="gc-virtual-copy">
        <strong>${name}</strong>
        <span>Concept game 3D</span>
        <small>Lên đến ${amount}</small>
      </div>
      <span class="gc-virtual-arrow">›</span>
    </article>`).join('')
}

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
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname })
  if (error) {
    setAuthMessage(box, error.message || 'Không thể gửi email đặt lại mật khẩu.', 'bad')
    return
  }
  setAuthMessage(box, 'Đã gửi liên kết đặt lại mật khẩu vào email của bạn.', 'ok')
}

function landingMarkup() {
  return `<div class="gc-public-home">
    <header class="gc-public-header">
      <div class="gc-public-logo" aria-label="Gamezcoin"><span>G</span><strong>GAMEZCOIN</strong></div>
      <nav class="gc-public-desktop-links" aria-label="Điều hướng giới thiệu">
        <a href="#gc-games">Game</a><a href="#gc-proof">Uy tín</a><a href="#gc-how">Cách chơi</a><a href="#gc-cashout">Rút tiền</a>
      </nav>
      <div class="gc-public-header-actions">
        <span class="gc-public-language" title="Tiếng Việt">${globeIcon}<small>VI</small></span>
        <button type="button" class="gc-public-signin" data-public-auth="login">Đăng nhập</button>
        <button type="button" class="gc-public-signup" data-public-auth="signup">Đăng ký</button>
      </div>
    </header>

    <section class="gc-public-hero">
      <div class="gc-public-hero-copy">
        <span class="gc-public-eyebrow">GAMEZCOIN • Chơi game & Kiếm tiền</span>
        <h1>Chơi game &<br><em>kiếm tiền</em></h1>
        <p>Chơi game, kiếm tiền thật và rút thưởng uy tín, nhanh chóng về ví của bạn</p>
        <div class="gc-public-hero-cta">
          <button type="button" class="gc-hero-explore" data-public-auth="signup">Bắt đầu kiếm tiền ${arrowIcon}</button>
          <button type="button" class="secondary" data-public-auth="login">Đăng nhập</button>
        </div>
        <div class="gc-public-hero-meta">
          <span><i class="gc-hero-metric-icon gc-metric-star" aria-hidden="true">★</i><b>4.8/5 Đánh giá</b></span>
          <span><i class="gc-hero-metric-icon gc-metric-users" aria-hidden="true">${usersMetricIcon}</i><b>100.000+ Người dùng thật</b></span>
          <span><i class="gc-hero-metric-icon gc-metric-bolt" aria-hidden="true">${boltIcon}</i><b>Thanh toán nhanh chóng</b></span>
        </div>
      </div>
      <div class="gc-public-hero-art" aria-hidden="true">
        <div class="gc-hero-visual">
          <div class="gc-hero-ring"></div>
          <article class="gc-hero-feature-card">
            <img src="${gameArtUrl('galaxy-match-3d.webp')}" alt="" width="960" height="540" decoding="async" fetchpriority="high" draggable="false">
            <span>12 GAME 3D</span>
            <div><small>BỘ SƯU TẬP GAMEZCOIN</small><strong>Thế giới game mới đang chờ bạn</strong></div>
          </article>
          <article class="gc-hero-mini-card gc-hero-mini-one"><img src="${gameArtUrl('dragon-merge-3d.webp')}" alt="" width="960" height="540" decoding="async" draggable="false"><b>Dragon Merge</b></article>
          <article class="gc-hero-mini-card gc-hero-mini-two"><img src="${gameArtUrl('candy-merge-3d.webp')}" alt="" width="960" height="540" decoding="async" draggable="false"><b>Candy Merge</b></article>
        </div>
      </div>
    </section>

    <section class="gc-public-virtual-games" id="gc-games">
      <div class="gc-public-section-title"><h2>NHIỀU GAME<br><em>ĐANG ĐỢI BẠN CHƠI</em></h2><p>Hàng trăm game hot - Kiếm tiền thật dễ dàng</p></div>
      <div class="gc-virtual-grid">${virtualGameCards()}</div>
      <button class="gc-more-games" type="button" data-public-auth="signup">Đăng ký để chơi game & kiếm tiền ${arrowIcon}</button>
    </section>

    <section class="gc-public-proof gc-proof-reference" id="gc-proof">
      <h2>Vì sao người chơi tin dùng Gamezcoin</h2>
      <div class="gc-proof-reference-grid">
        <article><span class="gc-proof-reference-icon">${boltIcon}</span><div><strong>Rút tiền nhanh</strong><p>Xử lý tự động 24/7, nhanh chóng chỉ từ 1 – 10 phút</p></div></article>
        <article><span class="gc-proof-reference-icon">${shieldIcon}</span><div><strong>Minh bạch</strong><p>Công khai lịch sử thanh toán, minh bạch số liệu, không phí ẩn</p></div></article>
        <article><span class="gc-proof-reference-icon">${lockIcon}</span><div><strong>Bảo mật</strong><p>Bảo mật nhiều lớp, đảm bảo an toàn tuyệt đối cho tài khoản của bạn</p></div></article>
        <article><span class="gc-proof-reference-icon">${gameIcon}</span><div><strong>Game hot mỗi ngày</strong><p>Cập nhật hàng trăm game mới, nhiều ưu đãi, phần thưởng hấp dẫn mỗi ngày</p></div></article>
      </div>
    </section>

    <section class="gc-public-how gc-how-reference" id="gc-how">
      <div class="gc-how-reference-title"><h2>Bạn muốn kiếm tiền<br>từ game? <em>Đây là cách</em></h2></div>
      <div class="gc-how-reference-steps">
        <article class="gc-reference-step gc-reference-step-games">
          <div class="gc-reference-step-head"><span class="gc-reference-step-icon">${gameIcon}</span><div><h3><em>1.</em> Chọn một game kiếm tiền</h3><p>Duyệt qua nhiều game hấp dẫn và chọn trò chơi phù hợp với bạn.</p></div></div>
          <div class="gc-reference-game-board">${virtualGames.map(([name, , image, amount]) => `<span class="gc-reference-game-card"><img src="${gameArtUrl(image)}" alt="" width="960" height="540" loading="lazy" decoding="async" draggable="false"><span><b>${name}</b><small>Chơi & kiếm tiền</small><em>${amount}</em></span><i>G</i></span>`).join('')}</div>
        </article>
        <article class="gc-reference-step gc-reference-step-complete">
          <div class="gc-reference-centered-copy"><h3><em>2.</em> Hoàn thành game</h3><p>Mỗi game có mục tiêu cụ thể. Hoàn thành <b>đúng điều kiện</b> để hệ thống ghi nhận kết quả.</p></div>
          <div class="gc-reference-complete-card"><img src="${gameArtUrl('dragon-merge-3d.webp')}" alt="" width="960" height="540" loading="lazy" decoding="async" draggable="false"><div class="gc-reference-stars" aria-label="5 sao">★★★★★</div><div class="gc-reference-result"><span>G</span><strong>250.000đ</strong><b>Hoàn thành mục tiêu</b></div></div>
        </article>
        <article class="gc-reference-step gc-reference-step-cashout" id="gc-cashout">
          <div class="gc-reference-step-head"><span class="gc-reference-step-icon">${walletIcon}</span><div><h3><em>3.</em> Nhận tiền</h3><p>Gửi yêu cầu rút qua phương thức đang hỗ trợ và theo dõi trạng thái ngay trong tài khoản.</p></div></div>
          <div class="gc-reference-phone">
            <i class="gc-reference-phone-notch"></i>
            <header><span>‹</span><b>Rút tiền</b><small>${shieldIcon} An toàn</small></header>
            <h4>Chọn phương thức rút tiền</h4>
            <div class="gc-reference-methods">
              <span class="is-active"><i class="gc-pay-logo gc-pay-momo"><img src="${paymentAssetUrl('momo-logo.webp')}" alt="" width="1200" height="1200" loading="lazy" decoding="async"></i><b>MoMo</b><small>${checkIcon} Đang hỗ trợ</small></span>
              <span><i class="gc-pay-logo gc-pay-zalo"><img src="${paymentAssetUrl('zalopay-logo.png')}" alt="" width="1200" height="1200" loading="lazy" decoding="async"></i><b>ZaloPay</b><small>Sắp hỗ trợ</small></span>
              <span class="is-active"><i class="gc-pay-logo gc-pay-bank"><img src="${paymentAssetUrl('bank-transfer.svg')}" alt="" width="128" height="128" loading="lazy" decoding="async"></i><b>Chuyển khoản<br>ngân hàng</b><small>${checkIcon} Đang hỗ trợ</small></span>
              <span><i class="gc-pay-logo gc-pay-paypal"><img src="${paymentAssetUrl('paypal-logo.png')}" alt="" width="512" height="512" loading="lazy" decoding="async"></i><b>PayPal</b><small>Sắp hỗ trợ</small></span>
              <span class="gc-method-last"><i class="gc-pay-logo gc-pay-play"><img src="${paymentAssetUrl('google-play-logo.webp')}" alt="" width="512" height="512" loading="lazy" decoding="async"></i><b>Google Play</b><small>Sắp hỗ trợ</small></span>
            </div>
          </div>
          <div class="gc-reference-security">${shieldIcon}<span>Dữ liệu theo tài khoản · Trạng thái xử lý rõ ràng</span></div>
        </article>
      </div>
    </section>

    <section class="gc-public-faq gc-faq-reference">
      <h2>Câu hỏi thường gặp</h2>
      <details><summary>Gamezcoin có thật sự trả thưởng không?</summary><p>Có. Khi bạn hoàn thành đúng điều kiện của game hoặc nhiệm vụ đang hoạt động, coin hợp lệ sẽ được ghi nhận vào Ví Gamezcoin. Số dư và mọi yêu cầu rút đều được lưu trong lịch sử giao dịch của chính tài khoản.</p></details>
      <details><summary>Rút tiền mất bao lâu?</summary><p>Yêu cầu được tiếp nhận ngay sau khi gửi. Thời gian xử lý phụ thuộc bước xác minh và phương thức nhận tiền; bạn có thể theo dõi trạng thái Đang chờ, Đã thanh toán hoặc Từ chối trực tiếp trong Ví.</p></details>
      <details><summary>Tôi có thể chơi trên điện thoại không?</summary><p>Có. Giao diện Gamezcoin và kho game được tối ưu cho điện thoại. Để trải nghiệm ổn định, hãy dùng phiên bản Chrome hoặc Safari mới nhất và duy trì kết nối mạng tốt.</p></details>
      <details><summary>Cần bao nhiêu coin để rút?</summary><p>Mức rút tối thiểu hiện tại là 20.000 coin. Nếu mức tối thiểu được điều chỉnh, con số mới sẽ luôn hiển thị trực tiếp trong màn hình Rút tiền trước khi bạn gửi yêu cầu.</p></details>
    </section>

    <section class="gc-public-final-cta gc-final-reference">
      <img class="gc-final-reference-image" src="${finalBannerImageUrl}" alt="" width="941" height="189" loading="eager" decoding="async" draggable="false">
      <div class="gc-final-reference-copy">
        <h2>Bắt đầu <em>chơi game kiếm tiền</em><br>ngay hôm nay</h2>
        <div class="gc-final-buttons"><button type="button" data-public-auth="signup">Đăng ký miễn phí</button><button type="button" class="secondary" data-public-auth="login">Đăng nhập</button></div>
      </div>
    </section>

    <footer class="gc-public-footer">
      <div class="gc-public-footer-brand"><span>G</span><strong>GAMEZCOIN</strong><p>Chơi game kiếm tiền với dữ liệu giao dịch minh bạch trong tài khoản.</p></div>
      <div><b>Hỗ trợ</b><span>Trung tâm trợ giúp</span><span>Hướng dẫn</span><span>Chính sách bảo mật</span><span>Điều khoản sử dụng</span></div>
      <div><b>Về Gamezcoin</b><span>Giới thiệu</span><span>Kho game 3D</span><span>Phương thức rút tiền</span></div>
      <div><b>Minh bạch</b><span>Không số liệu giả</span><span>Không review giả</span><span>Trạng thái game rõ ràng</span></div>
      <small>© 2026 Gamezcoin. All rights reserved.</small>
    </footer>

    <button type="button" class="gc-mobile-sticky-cta" data-public-auth="signup"><span class="gc-sticky-game-icon">${gameIcon}</span><strong>Bắt đầu kiếm tiền ngay bây giờ</strong><span class="gc-sticky-arrow">${arrowIcon}</span></button>
    <nav class="gc-public-bottom-nav" aria-label="Điều hướng khách"><button type="button" class="on" data-public-home><span class="gc-bottom-nav-icon">${homeNavIcon}</span><small>Nhà</small><i class="gc-nav-dot" aria-hidden="true"></i></button><button type="button" data-public-auth="login"><span class="gc-bottom-nav-icon">${cashoutNavIcon}</span><small>Rút tiền mặt</small></button></nav>
  </div>`
}

function closeAuth(main) {
  requestedMode = null
  main.classList.remove('gc-auth-modal-visible')
  document.body.classList.remove('gc-auth-modal-open')
}

function decorateAuthBox(main, box, login) {
  box.classList.add('gc-public-auth-panel')
  box.insertAdjacentHTML('afterbegin', `<button type="button" class="gc-auth-close" aria-label="Đóng">${closeIcon}</button><div class="gc-auth-mobile-brand"><span>G</span><strong>Gamezcoin</strong></div><header class="gc-auth-heading"><small>${login ? 'CHÀO MỪNG TRỞ LẠI' : 'THAM GIA GAMEZCOIN'}</small><h1>${login ? 'Đăng nhập' : 'Tạo tài khoản miễn phí'}</h1><p>${login ? 'Đăng nhập để chơi game, xem số dư và lịch sử giao dịch.' : 'Tạo tài khoản trong vài giây để bắt đầu chơi game kiếm tiền.'}</p></header>`)

  const switcher = box.querySelector('.switch')
  switcher?.classList.add('gc-auth-switch')
  switcher?.querySelectorAll('[data-mode]').forEach((button) => button.addEventListener('click', () => { requestedMode = button.dataset.mode }, true))

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
  if (nameInput) { nameInput.placeholder = 'Tên hiển thị'; nameInput.autocomplete = 'name' }
  if (emailInput) { emailInput.placeholder = 'name@example.com'; emailInput.autocomplete = 'email'; emailInput.inputMode = 'email' }
  if (passwordInput) { passwordInput.placeholder = 'Tối thiểu 6 ký tự'; passwordInput.autocomplete = login ? 'current-password' : 'new-password' }
  if (refInput) { refInput.placeholder = 'Mã giới thiệu (nếu có)'; refInput.autocomplete = 'off' }

  const passwordLabel = passwordInput?.closest('label')
  if (login && passwordLabel) {
    const forgot = document.createElement('button')
    forgot.type = 'button'; forgot.className = 'gc-auth-forgot'; forgot.textContent = 'Quên mật khẩu?'
    forgot.addEventListener('click', () => resetPassword(box)); passwordLabel.append(forgot)
  }

  form?.querySelector('button[type="submit"]')?.classList.add('gc-auth-submit')
  box.querySelector(':scope > small')?.remove()
  box.insertAdjacentHTML('beforeend', `<div class="gc-auth-bottom-link"><span>${login ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}</span><button type="button" data-gc-auth-toggle>${login ? 'Đăng ký' : 'Đăng nhập'}</button></div><p class="gc-auth-terms">Bằng cách tiếp tục, bạn đồng ý với Điều khoản sử dụng và Chính sách quyền riêng tư của Gamezcoin.</p>`)

  box.querySelector('.gc-auth-close')?.addEventListener('click', () => closeAuth(main))
  box.querySelector('[data-gc-auth-toggle]')?.addEventListener('click', () => {
    requestedMode = login ? 'signup' : 'login'
    box.querySelector(`[data-mode="${requestedMode}"]`)?.click()
  })
}

function bindLanding(main) {
  main.querySelectorAll('[data-public-auth]').forEach((button) => {
    button.addEventListener('click', () => {
      const mode = button.dataset.publicAuth || 'signup'
      requestedMode = mode
      const active = main.querySelector(`.gc-public-auth-panel [data-mode="${mode}"]`)
      if (active && !active.classList.contains('on')) { active.click(); return }
      main.classList.add('gc-auth-modal-visible')
      document.body.classList.add('gc-auth-modal-open')
      setTimeout(() => main.querySelector('.gc-public-auth-panel input')?.focus(), 40)
    })
  })
  main.querySelector('[data-public-home]')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }))
  main.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', (event) => {
    const target = main.querySelector(a.getAttribute('href'))
    if (!target) return
    event.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }))
}

function enhanceAuth() {
  const main = app?.querySelector('main.auth')
  if (!main) { document.body.classList.remove('gc-auth-modal-open'); return }
  if (main.dataset.gcPublicReady === '1') return
  main.dataset.gcPublicReady = '1'
  main.classList.add('gc-public-auth')

  const brand = main.querySelector('.brand')
  const box = main.querySelector('.authbox')
  if (!box) return
  const login = box.querySelector('[data-mode="login"]')?.classList.contains('on') !== false
  brand?.remove()

  const landing = document.createElement('div')
  landing.innerHTML = landingMarkup()
  main.insertBefore(landing.firstElementChild, box)
  const overlay = document.createElement('div')
  overlay.className = 'gc-auth-modal'
  const backdrop = document.createElement('button')
  backdrop.type = 'button'; backdrop.className = 'gc-auth-backdrop'; backdrop.setAttribute('aria-label', 'Đóng')
  const dialog = document.createElement('div')
  dialog.className = 'gc-auth-dialog'; dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true')
  box.insertAdjacentElement('beforebegin', overlay)
  overlay.append(backdrop, dialog)
  dialog.append(box)

  decorateAuthBox(main, box, login)
  bindLanding(main)
  backdrop.addEventListener('click', () => closeAuth(main))

  if (requestedMode) {
    const wanted = box.querySelector(`[data-mode="${requestedMode}"]`)
    if (wanted && !wanted.classList.contains('on')) { wanted.click(); return }
    main.classList.add('gc-auth-modal-visible')
    document.body.classList.add('gc-auth-modal-open')
  }
}

function schedule() {
  if (queued) return
  queued = true
  queueMicrotask(() => { queued = false; enhanceAuth() })
}

new MutationObserver(schedule).observe(app || document.documentElement, { childList: true, subtree: true })
window.addEventListener('pageshow', schedule)
schedule()
