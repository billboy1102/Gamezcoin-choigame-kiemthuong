import './block-intro.css'

const PLAY_ID = 'play-block'
let overlay = null

function currentRewardText(button) {
  const card = button?.closest?.('.block-card')
  return card?.querySelector('em')?.textContent?.trim() || '10 điểm = 1 coin'
}

function boardPreview() {
  const filledBlue = new Set([40,41,42,43,44,45,46,47,30,38,46,18,19,20])
  const filledGold = new Set([8,16,24,32,33,34,35])
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
  overlay = document.createElement('main')
  overlay.className = 'block-intro-overlay'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlay.setAttribute('aria-label', 'Hướng dẫn Block Blast')
  overlay.innerHTML = `
    <section class="block-intro-shell">
      <header class="block-intro-head">
        <button class="block-intro-back" id="block-intro-back" aria-label="Quay lại">‹</button>
        <div><small>MINI GAME</small><strong>BLOCK BLAST</strong></div>
        <span class="block-intro-chip" aria-hidden="true">▦</span>
      </header>

      <div class="block-demo" aria-hidden="true">
        <div class="block-demo-grid">${boardPreview()}</div>
        <div class="block-demo-copy">
          <b>XẾP KHỐI · PHÁ HÀNG</b>
          <span>Giữ bảng còn chỗ trống càng lâu càng tốt</span>
        </div>
      </div>

      <section class="block-intro-card block-summary">
        <h2>Block Blast là gì?</h2>
        <p>Kéo các khối vào lưới 8×8, lấp đầy hàng hoặc cột để phá khối, tạo combo và ghi càng nhiều điểm càng tốt.</p>
        <div class="block-reward-grid">
          <div><small>BẢNG CHƠI</small><b>Lưới 8×8</b></div>
          <div><small>QUY ĐỔI</small><b>${reward}</b></div>
        </div>
      </section>

      <section class="block-intro-card">
        <h2>Hướng dẫn chơi</h2>
        <ol class="block-steps">
          <li><i>1</i><div><b>Chọn một trong 3 khối</b><span>Nhấn giữ rồi kéo một khối từ khay phía dưới lên bảng chơi.</span></div></li>
          <li><i>2</i><div><b>Đặt khối vào ô trống</b><span>Toàn bộ khối phải nằm trong lưới 8×8 và không được đè lên khối đã có.</span></div></li>
          <li><i>3</i><div><b>Lấp đầy hàng hoặc cột</b><span>Đủ 8 ô theo chiều ngang hoặc dọc sẽ phá cả hàng/cột và cộng thêm điểm.</span></div></li>
          <li><i>4</i><div><b>Tạo combo để tăng điểm</b><span>Phá hàng/cột liên tiếp ở các lượt kế tiếp để duy trì combo và tăng điểm thưởng.</span></div></li>
          <li><i>5</i><div><b>Hết chỗ đặt là Game Over</b><span>Khi không còn vị trí hợp lệ cho các khối còn lại, điểm cuối ván được gửi lên server để xác minh và cộng coin.</span></div></li>
        </ol>
      </section>

      <section class="block-intro-card block-note">
        <b>💡 Mẹo</b>
        <p>Ưu tiên giữ khoảng trống ở giữa bảng và đừng lấp kín các góc quá sớm. Tạo khoảng trống cho nhiều dạng khối sẽ giúp ván kéo dài hơn.</p>
      </section>

      <div class="block-intro-actions">
        <button id="block-intro-start" class="block-intro-start">▶ Bắt đầu chơi</button>
        <small>Điểm và coin chỉ được ghi khi server xác minh ván chơi.</small>
      </div>
    </section>`

  document.body.append(overlay)
  document.body.style.overflow = 'hidden'

  overlay.querySelector('#block-intro-back').onclick = closeIntro
  overlay.querySelector('#block-intro-start').onclick = () => {
    const startGame = globalThis.GamezcoinStartBlockBlast
    closeIntro()

    if (typeof startGame === 'function') {
      startGame()
      return
    }

    // Fallback for an unusually slow/cached module load. The normal path above
    // is direct and does not depend on Safari dispatching a synthetic click.
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
