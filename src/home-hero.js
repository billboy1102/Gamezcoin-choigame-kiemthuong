import './home-hero.css'

let queued = false

function currentBalance() {
  const text = document.querySelector('.shell>header .balance')?.textContent || ''
  const match = text.match(/[\d][\d.,]*/)
  return match?.[0] || '0'
}

function goTo(tab) {
  document.querySelector(`.shell>nav [data-tab="${tab}"]`)?.click()
}

function installHero() {
  const nav = document.querySelector('.shell>nav button.on')
  if (!nav || nav.dataset.tab !== 'games') return

  const hero = document.querySelector('#view .home-welcome')
  if (!hero) return

  const balance = currentBalance()
  if (hero.dataset.homeBalanceHero === '1') {
    const value = hero.querySelector('[data-home-balance-value]')
    if (value && value.textContent !== balance) value.textContent = balance
    return
  }

  hero.dataset.homeBalanceHero = '1'
  hero.classList.add('gamez-home-balance')
  hero.innerHTML = `
    <div class="home-balance-content">
      <div class="home-balance-label">
        <span class="home-balance-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 7.5h15.5a1.5 1.5 0 0 1 1.5 1.5v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12"/>
            <path d="M3 8h17M16 14h5"/>
            <circle cx="16" cy="14" r=".7" fill="currentColor" stroke="none"/>
          </svg>
        </span>
        <span>Số dư khả dụng</span>
      </div>

      <div class="home-balance-value"><span data-home-balance-value>${balance}</span><small>coin</small></div>
      <p class="home-balance-desc">Coin từ chơi game, điểm danh và giới thiệu bạn bè được server xác minh trước khi ghi vào ví.</p>

      <div class="home-balance-actions">
        <button class="home-balance-earn" id="home-hero-earn">Kiếm thưởng <span>›</span></button>
        <button class="home-balance-withdraw" id="home-hero-withdraw">Rút tiền</button>
      </div>
    </div>`

  hero.querySelector('#home-hero-earn')?.addEventListener('click', () => goTo('checkin'))
  hero.querySelector('#home-hero-withdraw')?.addEventListener('click', () => goTo('wallet'))
}

function schedule() {
  if (queued) return
  queued = true
  queueMicrotask(() => {
    queued = false
    installHero()
  })
}

new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true })
window.addEventListener('pageshow', schedule)
schedule()
