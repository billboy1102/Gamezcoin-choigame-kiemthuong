import { api } from './api.js'
import { startOrbitBreak } from './orbit-game.js'

let cachedOrbit = null
let loadingOrbitConfig = null

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]))

function formatNumber(value) {
  return new Intl.NumberFormat('vi-VN').format(Number(value || 0))
}

async function getOrbitConfig() {
  if (cachedOrbit) return cachedOrbit
  if (!loadingOrbitConfig) {
    loadingOrbitConfig = api('bootstrap')
      .then((data) => {
        cachedOrbit = (data.games || []).find((game) => game.id === 'orbit-break' && game.enabled !== false) || null
        return cachedOrbit
      })
      .finally(() => { loadingOrbitConfig = null })
  }
  return loadingOrbitConfig
}

function updateVisibleBalance(data) {
  const button = document.querySelector('header .balance')
  if (!button || !data?.wallet) return
  button.innerHTML = `<span>G</span>${formatNumber(data.wallet.balance)} coin`
}

function showOrbitIntro(orbit) {
  if (document.querySelector('.orbit-intro')) return
  const intro = document.createElement('main')
  intro.className = 'orbit-intro'
  intro.innerHTML = `
    <section class="orbit-intro-shell">
      <header class="orbit-intro-head">
        <button class="orbit-intro-back" aria-label="Quay lại">‹</button>
        <div><small>MINI GAME</small><strong>ORBIT BREAK</strong></div>
        <span class="orbit-intro-chip">◉</span>
      </header>

      <div class="orbit-demo" aria-hidden="true">
        <div class="orbit-demo-ring"></div>
        <div class="orbit-demo-target"></div>
        <div class="orbit-demo-core"></div>
        <div class="orbit-demo-dot"></div>
        <div class="orbit-demo-copy"><b>CHẠM ĐÚNG NHỊP</b><span>Giữ quỹ đạo sống càng lâu càng tốt</span></div>
      </div>

      <section class="orbit-intro-card orbit-summary">
        <h2>ORBIT BREAK là gì?</h2>
        <p>${escapeHtml(orbit?.description || 'Bấm đúng nhịp để chuyển quỹ đạo. Mỗi lần bấm đúng +10 điểm; 100 điểm = 10 coin.')}</p>
        <div class="orbit-reward-grid">
          <div><small>MỖI LẦN ĐÚNG</small><b>+10 điểm</b></div>
          <div><small>QUY ĐỔI</small><b>100 điểm = 10 coin</b></div>
        </div>
      </section>

      <section class="orbit-intro-card">
        <h2>Hướng dẫn chơi</h2>
        <ol class="orbit-steps">
          <li><i>1</i><div><b>Quan sát quả cầu đang xoay</b><span>Quả cầu sẽ chạy quanh tâm theo quỹ đạo neon.</span></div></li>
          <li><i>2</i><div><b>Chạm khi quả cầu tới vùng mục tiêu</b><span>Chạm đúng thời điểm để chuyển sang quỹ đạo tiếp theo.</span></div></li>
          <li><i>3</i><div><b>Mỗi lần đúng nhận 10 điểm</b><span>10 lần bấm đúng = 100 điểm = 10 coin khi ván kết thúc hợp lệ.</span></div></li>
          <li><i>4</i><div><b>Tốc độ tăng dần</b><span>Càng chơi lâu, nhịp càng nhanh và thời điểm bấm càng khó.</span></div></li>
          <li><i>5</i><div><b>Bấm sớm, bấm muộn hoặc bỏ lỡ là Game Over</b><span>Điểm cuối ván được gửi lên server xác minh rồi mới cộng coin.</span></div></li>
        </ol>
      </section>

      <section class="orbit-intro-card orbit-note">
        <b>💡 Mẹo</b>
        <p>Đừng nhìn vào ngón tay. Hãy tập trung vào vùng mục tiêu và nhịp chuyển động của quả cầu. Âm thanh giúp canh nhịp chính xác hơn.</p>
      </section>

      <div class="orbit-intro-actions">
        <button class="orbit-start-button">▶ Bắt đầu chơi</button>
        <small>Điểm/coin chỉ được ghi khi server xác minh ván chơi.</small>
      </div>
    </section>`

  const close = () => intro.remove()
  intro.querySelector('.orbit-intro-back').onclick = close
  intro.querySelector('.orbit-start-button').onclick = () => {
    close()
    startOrbitBreak({
      api,
      refresh: () => api('bootstrap'),
      onReward: ({ data }) => updateVisibleBalance(data),
    })
  }
  document.body.append(intro)
}

async function injectOrbitCard() {
  const games = document.querySelector('#view .games')
  if (!games || games.querySelector('#play-orbit') || games.dataset.orbitLoading === '1') return
  games.dataset.orbitLoading = '1'
  try {
    const orbit = await getOrbitConfig()
    if (!orbit || !document.body.contains(games) || games.querySelector('#play-orbit')) return

    const oldOnlyBadge = games.querySelector('.block-card .block-badge')
    if (oldOnlyBadge && oldOnlyBadge.textContent.includes('DUY NHẤT')) oldOnlyBadge.textContent = 'BLOCK BLAST'

    const card = document.createElement('article')
    card.className = 'card game orbit-card'
    card.innerHTML = `
      <div class="gi orbit-gi">◉</div>
      <div>
        <strong>${escapeHtml(orbit.name || 'ORBIT BREAK')}</strong>
        <small>${escapeHtml(orbit.description || 'Bấm đúng nhịp để chuyển quỹ đạo.')}</small>
        <em>+10 điểm/lần đúng · 100 điểm = 10 coin</em>
        <span class="block-badge">ORBIT BREAK</span>
      </div>
      <button id="play-orbit">Chơi</button>`
    games.append(card)

    card.querySelector('#play-orbit').onclick = () => showOrbitIntro(orbit)
  } catch (error) {
    console.error('Không tải được cấu hình ORBIT BREAK', error)
  } finally {
    delete games.dataset.orbitLoading
  }
}

const style = document.createElement('style')
style.textContent = `
  .orbit-card{position:relative;overflow:hidden;background:linear-gradient(145deg,rgba(8,17,39,.98),rgba(18,12,42,.98))!important;border-color:rgba(98,246,255,.18)!important}
  .orbit-card:before{content:"";position:absolute;right:-42px;top:-58px;width:150px;height:150px;border-radius:50%;border:2px solid rgba(98,246,255,.13);box-shadow:0 0 40px rgba(255,69,207,.08);pointer-events:none}
  .orbit-card .orbit-gi{color:#72f7ff;text-shadow:0 0 18px rgba(98,246,255,.55);font-size:34px}
  .orbit-card em{color:#72f7ff!important}

  .orbit-intro{position:fixed;inset:0;z-index:99998;overflow:auto;background:radial-gradient(circle at 50% 4%,#152755 0,#07111f 38%,#030812 100%);color:#f5fbff;font-family:system-ui,-apple-system,sans-serif;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)}
  .orbit-intro-shell{width:min(100%,560px);min-height:100%;margin:auto;padding:14px 16px 28px}
  .orbit-intro-head{display:grid;grid-template-columns:48px 1fr 48px;align-items:center;gap:10px;margin-bottom:14px}
  .orbit-intro-head>div{text-align:center}.orbit-intro-head small{display:block;font-size:10px;letter-spacing:2px;color:#79dff5;font-weight:900}.orbit-intro-head strong{display:block;font-size:22px;letter-spacing:1px;margin-top:2px}
  .orbit-intro-back{width:46px;height:46px;border-radius:50%;border:1px solid #ffffff18;background:#081324cc;color:#fff;font-size:34px;line-height:36px;padding:0}
  .orbit-intro-chip{width:42px;height:42px;display:grid;place-items:center;border-radius:50%;border:1px solid #62f6ff45;color:#70f4ff;background:#081a2c;box-shadow:0 0 22px #62f6ff20;font-size:25px}
  .orbit-demo{position:relative;height:230px;border-radius:30px;overflow:hidden;background:radial-gradient(circle at 50% 45%,#1e2d5b 0,#091429 46%,#040914 100%);border:1px solid #7cecff20;box-shadow:0 25px 70px #0008,inset 0 1px 0 #ffffff0d;margin-bottom:14px}
  .orbit-demo:before{content:"";position:absolute;inset:0;background:linear-gradient(#62f6ff08 1px,transparent 1px),linear-gradient(90deg,#62f6ff08 1px,transparent 1px);background-size:28px 28px;mask-image:linear-gradient(to bottom,#000,transparent)}
  .orbit-demo-ring{position:absolute;left:50%;top:44%;width:126px;height:126px;transform:translate(-50%,-50%);border:2px dashed #62f6ff3d;border-radius:50%;box-shadow:0 0 30px #62f6ff12}
  .orbit-demo-core{position:absolute;left:50%;top:44%;width:25px;height:25px;transform:translate(-50%,-50%);border-radius:50%;background:#ff55cf;box-shadow:0 0 12px #ff55cf,0 0 28px #ff55cf88}
  .orbit-demo-target{position:absolute;left:calc(50% + 56px);top:calc(44% - 41px);width:32px;height:32px;border-radius:50%;border:3px solid #62f6ff;box-shadow:0 0 15px #62f6ff,0 0 30px #62f6ff66}
  .orbit-demo-dot{position:absolute;left:calc(50% - 8px);top:calc(44% - 71px);width:18px;height:18px;border-radius:50%;background:#62f6ff;box-shadow:0 0 10px #62f6ff,0 0 24px #62f6ff;transform-origin:8px 71px;animation:orbitDemoSpin 2.2s linear infinite}
  @keyframes orbitDemoSpin{to{transform:rotate(360deg)}}
  .orbit-demo-copy{position:absolute;left:0;right:0;bottom:20px;text-align:center}.orbit-demo-copy b{display:block;font-size:16px;letter-spacing:1.5px}.orbit-demo-copy span{display:block;margin-top:4px;color:#91abc4;font-size:12px}
  .orbit-intro-card{margin-top:12px;padding:18px;border:1px solid #ffffff12;border-radius:22px;background:linear-gradient(180deg,#0c182cf2,#07111ff2);box-shadow:inset 0 1px 0 #ffffff08}
  .orbit-intro-card h2{font-size:17px;margin:0 0 10px}.orbit-intro-card p{margin:0;color:#a9bfd2;font-size:13px;line-height:1.55}
  .orbit-reward-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:14px}.orbit-reward-grid>div{padding:13px;border-radius:16px;background:#071d2b;border:1px solid #62f6ff1f}.orbit-reward-grid small{display:block;font-size:9px;letter-spacing:1px;color:#74bfd0;font-weight:900}.orbit-reward-grid b{display:block;margin-top:5px;font-size:14px;color:#78f6ff}
  .orbit-steps{list-style:none;padding:0;margin:0;display:grid;gap:12px}.orbit-steps li{display:grid;grid-template-columns:32px 1fr;gap:11px;align-items:start}.orbit-steps i{width:30px;height:30px;display:grid;place-items:center;border-radius:50%;background:linear-gradient(135deg,#55eaff,#806cff);color:#04101d;font-style:normal;font-size:12px;font-weight:1000;box-shadow:0 0 18px #55eaff20}.orbit-steps b{display:block;font-size:13px}.orbit-steps span{display:block;margin-top:3px;color:#8fa8c0;font-size:12px;line-height:1.45}
  .orbit-note{border-color:#ffd46722;background:linear-gradient(180deg,#17192a,#0b1220)}.orbit-note>b{display:block;color:#ffd875;font-size:13px;margin-bottom:6px}
  .orbit-intro-actions{position:sticky;bottom:0;margin-top:16px;padding:14px 0 4px;background:linear-gradient(transparent,#030812 24%);text-align:center}.orbit-start-button{width:100%;height:58px;border:0;border-radius:18px;background:linear-gradient(90deg,#49eaff,#746cff 50%,#ff52cc);color:#fff;font-size:16px;font-weight:1000;letter-spacing:.4px;box-shadow:0 14px 36px #536dff35}.orbit-intro-actions small{display:block;margin-top:9px;color:#70869a;font-size:10px}
`
document.head.append(style)

const observer = new MutationObserver(() => injectOrbitCard())
observer.observe(document.documentElement, { childList: true, subtree: true })
injectOrbitCard()
