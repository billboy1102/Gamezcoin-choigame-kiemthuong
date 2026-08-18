import './block-intro.css'

const PLAY_ID = 'play-block'
let overlay = null

function currentRewardText(button) {
  const card = button?.closest?.('.block-card')
  return card?.querySelector('em')?.textContent?.trim() || '+1 coin / điểm'
}

function boardPreview() {
  const filledBlue = new Set([40,41,42,43,44,45,46,47, 30,38,46, 18,19,20])
  const filledGold = new Set([8,16,24,32, 33,34,35])
  const filledGreen = new Set([5,6,13,14,21,22])
  return Array.from({ length: 64 }, (_, i) => {
    const cls = filledBlue.has(i) ? ' f1' : filledGold.has(i) ? ' f2' : filledGreen.has(i) ? ' f3' : ''
    return `<i class="block-intro-cell${cls}"></i>`
  }).join('')
}

function closeIntro() {
  overlay?.remove()
  overlay = null
  document.body.style.overflow = ''
}

function openIntro(playButton) {
  closeIntro()
  const reward = currentRewardText(playButton)
  overlay = document.createElement('div')
  overlay.className = 'block-intro-overlay'
  overlay.innerHTML = `
    <main class="block-intro-shell" role="dialog" aria-modal="true" aria-label="Hướng dẫn Block Blast">
      <header class="block-intro-top">
        <button class="block-intro-back" id="block-intro-back" aria-label="Quay lại">‹</button>
        <div class="block-intro-title"><small>GAMEZCOIN</small><strong>Block Blast</strong></div>
        <span></span>
      </header>

      <section class="block-intro-hero">
        <div class="block-intro-icon">🧩</div>
        <h2>Xếp khối · Phá hàng · Nhận coin</h2>
        <p>Kéo các khối ở phía dưới vào bảng 8×8. Hoàn thành một hàng hoặc một cột để phá khối, tạo combo và tăng điểm. Ván chỉ kết thúc khi các khối còn lại không còn vị trí nào có thể đặt.</p>
        <div class="block-intro-rate">🪙 ${reward}</div>
      </section>

      <section class="block-intro-section">
        <h3>🎮 Cách chơi</h3>
        <div class="block-intro-steps">
          <div class="block-intro-step"><b>1</b><div><strong>Chọn một trong 3 khối</strong><span>Nhấn giữ rồi kéo khối từ khay phía dưới lên bảng chơi.</span></div></div>
          <div class="block-intro-step"><b>2</b><div><strong>Đặt vào ô trống</strong><span>Khối phải nằm hoàn toàn trong lưới 8×8 và không được đè lên khối đã có.</span></div></div>
          <div class="block-intro-step"><b>3</b><div><strong>Lấp đầy hàng hoặc cột</strong><span>Khi đủ 8 ô theo chiều ngang hoặc dọc, cả hàng/cột đó sẽ được phá và cộng điểm.</span></div></div>
          <div class="block-intro-step"><b>4</b><div><strong>Tạo combo để ghi nhiều điểm</strong><span>Liên tục phá hàng/cột ở các lượt kế tiếp để tăng combo và nhận thêm điểm thưởng.</span></div></div>
        </div>
      </section>

      <section class="block-intro-section">
        <h3>🧠 Ví dụ bảng chơi</h3>
        <div class="block-intro-board">${boardPreview()}</div>
      </section>

      <section class="block-intro-section">
        <h3>⭐ Luật tính điểm & nhận thưởng</h3>
        <div class="block-intro-rules">
          <div class="block-intro-rule"><b>•</b><span>Đặt khối thành công sẽ cộng điểm theo số ô của khối.</span></div>
          <div class="block-intro-rule"><b>•</b><span>Phá hàng/cột sẽ nhận thêm điểm; combo càng cao thì điểm thưởng càng lớn.</span></div>
          <div class="block-intro-rule"><b>•</b><span>Không giới hạn tổng coin kiếm được trong ngày.</span></div>
          <div class="block-intro-rule"><b>•</b><span>Khi Game Over, điểm cuối cùng được gửi lên server xác minh trước khi cộng coin vào ví.</span></div>
        </div>
      </section>

      <div class="block-intro-warning">⚠️ Thoát giữa ván sẽ không nhận coin cho ván đó. Những phiên có điểm bất thường có thể bị server từ chối để chống gian lận.</div>

      <div class="block-intro-actions">
        <button id="block-intro-start" class="block-intro-start">▶ Bắt đầu chơi</button>
      </div>
    </main>`

  document.body.append(overlay)
  document.body.style.overflow = 'hidden'

  overlay.querySelector('#block-intro-back').onclick = closeIntro
  overlay.querySelector('#block-intro-start').onclick = () => {
    closeIntro()
    playButton.dataset.blockIntroBypass = '1'
    playButton.click()
    delete playButton.dataset.blockIntroBypass
  }
}

document.addEventListener('click', (event) => {
  const playButton = event.target?.closest?.(`#${PLAY_ID}`)
  if (!playButton || playButton.dataset.blockIntroBypass === '1') return
  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()
  openIntro(playButton)
}, true)
