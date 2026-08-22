import './auth-public-home.css'
import { supabase } from './api.js'

const app = document.querySelector('#app')
let requestedMode = null
let queued = false

const gameArtUrl = (file) => `${import.meta.env.BASE_URL}assets/games/${file}`

const googleIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.23-.2-1.77H12v3.4h5.52a4.73 4.73 0 0 1-2.05 3.1l-.03.11 2.98 2.31.2.02c1.83-1.69 2.98-4.18 2.98-7.17Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.89 6.62-2.42l-3.15-2.44c-.84.57-1.95.98-3.47.98a6.02 6.02 0 0 1-5.7-4.16l-.1.01-3.1 2.4-.04.1A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.3 13.96A6.17 6.17 0 0 1 5.96 12c0-.68.12-1.34.33-1.96l-.01-.13-3.14-2.44-.1.05A10.05 10.05 0 0 0 2 12c0 1.61.38 3.13 1.05 4.48l3.25-2.52Z"/><path fill="#EA4335" d="M12 5.88c1.88 0 3.15.81 3.88 1.48l2.8-2.73C16.96 3.03 14.7 2 12 2a10 10 0 0 0-8.95 5.52l3.24 2.52A6.04 6.04 0 0 1 12 5.88Z"/></svg>`
const globeIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 2.6 4.2 5.6 4.2 9S14.8 18.4 12 21c-2.8-2.6-4.2-5.6-4.2-9S9.2 5.6 12 3Z"/></svg>`
const shieldIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 6v5.5c0 4.6-3.1 7.7-8 9.5-4.9-1.8-8-4.9-8-9.5V6l8-3Z"/><path d="m8.6 12 2.2 2.2 4.7-4.8"/></svg>`
const gameIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 8h9a5 5 0 0 1 4.8 6.4l-.8 2.6a2.6 2.6 0 0 1-4.1 1.3l-2.2-1.8H9.8l-2.2 1.8A2.6 2.6 0 0 1 3.5 17l-.8-2.6A5 5 0 0 1 7.5 8Z"/><path d="M7 12v4M5 14h4M16.5 12.8h.01M19 15h.01"/></svg>`
const walletIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2h12"/><path d="M3 8h17M15.5 13.7H20"/></svg>`
const checkIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>`
const boltIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m13.5 2-8 11h6.1L10.5 22l8-11h-6.1L13.5 2Z"/></svg>`
const clockIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.3 2"/></svg>`
const arrowIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>`
const closeIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>`

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
        <span class="gc-public-eyebrow"><i></i> GAMEZCOIN • Chơi game & Kiếm Tiền</span>
        <h1>Chơi game &<br><em>kiếm tiền</em></h1>
        <p>Chơi game, kiếm tiền thật và rút thưởng uy tín, nhanh chóng về ví của bạn</p>
        <div class="gc-public-hero-cta">
          <button type="button" class="gc-hero-explore" data-public-auth="signup">Bắt đầu kiếm tiền ${arrowIcon}</button>
          <button type="button" class="secondary" data-public-auth="login">Đăng nhập</button>
        </div>
        <div class="gc-public-hero-meta">
          <span><b>⭐️ 4.8/5 Đánh giá</b></span>
          <span><b>100.000+ Người dùng thật</b></span>
          <span><b>Thanh toán nhanh chóng</b></span>
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

    <section class="gc-public-proof" id="gc-proof">
      <div class="gc-public-section-title"><small>MINH BẠCH TRƯỚC KHI QUẢNG CÁO CON SỐ</small><h2>Chứng minh <em>uy tín & thanh toán</em></h2><p>Gamezcoin hiển thị những gì hệ thống hiện có thể xác minh, không dùng số người dùng hay tổng tiền chi trả giả.</p></div>
      <div class="gc-proof-grid">
        <article>${shieldIcon}<strong>Ván chơi được xác minh</strong><p>Nhiệm vụ chơi game chỉ ghi nhận sau khi phiên chơi kết thúc hợp lệ trên server.</p></article>
        <article>${walletIcon}<strong>Lịch sử ví rõ ràng</strong><p>Số dư, coin đã kiếm, giao dịch và yêu cầu rút được lưu trong tài khoản.</p></article>
        <article>${boltIcon}<strong>Trạng thái xử lý cụ thể</strong><p>Yêu cầu rút có trạng thái đang chờ, đã thanh toán hoặc từ chối.</p></article>
        <article>${checkIcon}<strong>Hoàn coin khi từ chối</strong><p>Nếu yêu cầu rút bị từ chối theo luồng hiện tại, coin được hoàn tự động.</p></article>
      </div>
      <div class="gc-payment-panel">
        <h3>Phương thức rút tiền</h3><p>Chỉ đánh dấu “đang hỗ trợ” cho phương thức đã có trong ứng dụng.</p>
        <div class="gc-payment-methods">
          <span class="active"><b>MoMo</b><small>Đang hỗ trợ</small></span>
          <span class="active"><b>Chuyển khoản ngân hàng</b><small>Đang hỗ trợ</small></span>
          <span><b>ZaloPay</b><small>Sắp hỗ trợ</small></span>
          <span><b>PayPal</b><small>Sắp hỗ trợ</small></span>
          <span><b>Thẻ quà tặng</b><small>Sắp hỗ trợ</small></span>
        </div>
      </div>
      <div class="gc-payment-history">
        <div><h3>Lịch sử rút thưởng minh bạch</h3><p>Khi đăng nhập, người dùng xem lịch sử rút thật của chính tài khoản thay vì các “giao dịch mẫu” giả tên người dùng.</p></div>
        <div class="gc-history-demo">
          <span><i></i><b>Yêu cầu rút</b><em>Đang chờ</em></span>
          <span><i></i><b>Admin xử lý</b><em>Đã thanh toán / Từ chối</em></span>
          <span><i></i><b>Lịch sử tài khoản</b><em>Cập nhật theo giao dịch thật</em></span>
        </div>
      </div>
    </section>

    <section class="gc-public-stats">
      <div class="gc-stat-card"><span>🚀</span><div><strong>Cơ chế thưởng rõ ràng</strong><p>Tỷ lệ quy đổi sẽ được hiển thị trong từng game khi chính thức phát hành.</p></div></div>
      <div class="gc-stat-card"><span>🔥</span><div><strong>Hoàn thành ván thật</strong><p>Mở game rồi thoát giữa chừng không được tính nhiệm vụ.</p></div></div>
      <div class="gc-stat-card"><span>🪙</span><div><strong>Coin lưu trên server</strong><p>Số dư đồng bộ theo tài khoản thay vì chỉ lưu trên trình duyệt.</p></div></div>
    </section>

    <section class="gc-public-how" id="gc-how">
      <div class="gc-public-section-title"><small>KIẾM TIỀN TỪ GAME NHƯ THẾ NÀO?</small><h2>Bạn muốn bắt đầu? <em>Đây là cách</em></h2></div>
      <div class="gc-how-stack">
        <article><span class="gc-step-icon">${gameIcon}</span><div class="gc-step-copy"><small>1</small><h3>Khám phá kho game</h3><p>Xem concept, thể loại và trạng thái phát hành của từng game. Đăng ký để nhận thông báo khi game sẵn sàng.</p></div><div class="gc-step-visual gc-step-games">${virtualGames.slice(0,6).map(([name, art]) => `<span class="gc-mini-game gc-mini-${art}"><b>${name}</b><small>Sắp ra mắt</small></span>`).join('')}</div></article>
        <article><span class="gc-step-icon">${checkIcon}</span><div class="gc-step-copy"><small>2</small><h3>Hoàn thành ván game</h3><p>Ván chơi phải kết thúc hợp lệ và được backend xử lý thành công. Đây là cơ chế giúp hạn chế việc chỉ mở game để nhận thưởng.</p></div><div class="gc-complete-demo"><div class="gc-demo-art">⚔️</div><div class="gc-demo-stars">★★★★★</div><span><b>Phiên chơi hợp lệ</b><em>Server xác minh</em></span></div></article>
        <article id="gc-cashout"><span class="gc-step-icon">${walletIcon}</span><div class="gc-step-copy"><small>3</small><h3>Rút tiền từ số dư</h3><p>Mở Ví, nhập số coin, chọn MoMo hoặc chuyển khoản ngân hàng và gửi yêu cầu rút. Trạng thái được lưu trong lịch sử tài khoản.</p></div><div class="gc-cashout-phone"><h4>Chọn phương thức rút tiền</h4><div><span>MoMo <i>Đang hỗ trợ</i></span><span>Ngân hàng <i>Đang hỗ trợ</i></span><span>PayPal <i>Sắp hỗ trợ</i></span><span>ZaloPay <i>Sắp hỗ trợ</i></span></div>${shieldIcon}<small>An toàn · Có trạng thái xử lý · Lưu lịch sử</small></div></article>
      </div>
    </section>

    <section class="gc-public-why">
      <div class="gc-public-section-title"><small>VÌ SAO CÁCH LÀM NÀY ĐÁNG TIN HƠN?</small><h2>Uy tín đến từ <em>dữ liệu có thể kiểm tra</em></h2></div>
      <div class="gc-why-grid">
        <article>${clockIcon}<h3>Không hứa thời gian rút giả</h3><p>Landing không quảng cáo “1–10 phút” nếu hệ thống chưa có dữ liệu thống kê đủ để chứng minh.</p></article>
        <article>${shieldIcon}<h3>Không bịa đánh giá</h3><p>Không gắn Trustpilot, số sao hoặc số lượng review nếu Gamezcoin chưa có hồ sơ đánh giá thật tương ứng.</p></article>
        <article>${walletIcon}<h3>Không bịa giao dịch</h3><p>Các bằng chứng thanh toán chỉ nên lấy từ giao dịch đã hoàn tất thật và được ẩn thông tin nhạy cảm.</p></article>
        <article>${gameIcon}<h3>Trạng thái game rõ ràng</h3><p>Game chưa phát hành được gắn nhãn “Sắp ra mắt” để người dùng luôn biết chính xác trạng thái sản phẩm.</p></article>
      </div>
    </section>

    <section class="gc-public-faq">
      <div class="gc-public-section-title"><small>GIẢI ĐÁP NHANH</small><h2>Câu hỏi thường gặp</h2></div>
      <details><summary>Khi nào các game trên landing có thể chơi?</summary><p>Toàn bộ game trong kho hiện là concept/sắp ra mắt. Gamezcoin sẽ cập nhật trạng thái và gửi thông báo cho tài khoản đã đăng ký khi từng game sẵn sàng.</p></details>
      <details><summary>Chơi game có được cộng tiền ngay khi mở game không?</summary><p>Không. Với nhiệm vụ chơi game, phiên phải kết thúc hợp lệ và backend xác minh thành công mới được ghi nhận.</p></details>
      <details><summary>Hiện có thể rút bằng phương thức nào?</summary><p>Luồng rút tiền hiện tại của ứng dụng hỗ trợ MoMo và chuyển khoản ngân hàng. Các phương thức khác trên landing được ghi là sắp hỗ trợ.</p></details>
      <details><summary>Làm sao kiểm tra một yêu cầu rút?</summary><p>Sau khi đăng nhập, người dùng xem lịch sử rút trong Ví với trạng thái đang chờ, đã thanh toán hoặc từ chối.</p></details>
    </section>

    <section class="gc-public-final-cta">
      <div><small>GAMEZCOIN</small><h2>Sẵn sàng cho <em>thế giới game mới</em></h2><p>Đăng ký miễn phí để nhận thông báo phát hành và theo dõi các cập nhật mới nhất từ Gamezcoin.</p></div>
      <div class="gc-final-buttons"><button type="button" data-public-auth="signup">Nhận thông báo ${arrowIcon}</button><button type="button" class="secondary" data-public-auth="login">Đăng nhập</button></div>
    </section>

    <footer class="gc-public-footer">
      <div class="gc-public-footer-brand"><span>G</span><strong>GAMEZCOIN</strong><p>Chơi game kiếm tiền với dữ liệu giao dịch minh bạch trong tài khoản.</p></div>
      <div><b>Hỗ trợ</b><span>Trung tâm trợ giúp</span><span>Hướng dẫn</span><span>Chính sách bảo mật</span><span>Điều khoản sử dụng</span></div>
      <div><b>Về Gamezcoin</b><span>Giới thiệu</span><span>Kho game 3D</span><span>Phương thức rút tiền</span></div>
      <div><b>Minh bạch</b><span>Không số liệu giả</span><span>Không review giả</span><span>Trạng thái game rõ ràng</span></div>
      <small>© 2026 Gamezcoin. All rights reserved.</small>
    </footer>

    <button type="button" class="gc-mobile-sticky-cta" data-public-auth="signup">${gameIcon}<span>Bắt đầu kiếm tiền</span>${arrowIcon}</button>
    <nav class="gc-public-bottom-nav" aria-label="Điều hướng khách"><button type="button" class="on" data-public-home><span>⌂</span><small>Nhà</small></button><button type="button" data-public-auth="login"><span>▣</span><small>Rút tiền mặt</small></button></nav>
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
