import './wallet-adcash.css'
import { api } from './api.js'

let queued = false
let rendering = false
let cached = null

const f = (value) => new Intl.NumberFormat('vi-VN').format(Number(value || 0))
const e = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]))
const dateText = (value) => {
  try { return new Date(value).toLocaleString('vi-VN') } catch { return '' }
}
const statusText = (value) => ({ pending: 'Đang chờ', paid: 'Đã thanh toán', rejected: 'Từ chối' }[value] || value || '')

const walletIcon = `
<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5h15.2A1.8 1.8 0 0 1 21 9.3v8.9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12"/><path d="M3 8h17.5M16 14h5"/><circle cx="16.6" cy="14" r=".8"/></svg>`
const inIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v10M8.5 10h5.2a2.2 2.2 0 0 1 0 4.4H10a2.2 2.2 0 0 1 0-4.4h5.5"/></svg>`
const outIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5h15.2A1.8 1.8 0 0 1 21 9.3v8.9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12"/><path d="M3 8h17.5M16 14h5"/></svg>`

function toast(message, type = '') {
  const root = document.querySelector('#toast-root')
  if (!root) return
  const node = document.createElement('div')
  node.className = `toast ${type}`
  node.textContent = message
  root.append(node)
  requestAnimationFrame(() => node.classList.add('show'))
  setTimeout(() => node.remove(), 3200)
}

async function loadWallet(force = false) {
  if (cached && !force) return cached
  cached = await api('dashboard')
  return cached
}

function activeWallet() {
  return document.querySelector('.shell>nav button.on')?.dataset.tab === 'wallet'
}

function walletViewIsCurrent(view) {
  if (!view) return false
  if (view.dataset.gcWalletAdcash === '1') return Boolean(view.querySelector('.gc-wallet-page'))
  if (view.dataset.gcWalletAdcash === 'withdraw') return Boolean(view.querySelector('.gc-withdraw-page'))
  return false
}

function transactionRows(data) {
  const ledger = (data.ledger || []).map((item) => ({
    id: `l-${item.id}`,
    title: item.description || 'Biến động coin',
    amount: Number(item.amount || 0),
    status: Number(item.amount || 0) >= 0 ? 'Đã cộng' : 'Đã trừ',
    created_at: item.created_at,
  }))
  const withdrawals = (data.withdrawals || []).map((item) => ({
    id: `w-${item.id}`,
    title: item.method === 'momo' ? 'Rút về MoMo' : 'Rút về ngân hàng',
    amount: -Math.abs(Number(item.coin_amount || 0)),
    status: statusText(item.status),
    created_at: item.created_at,
  }))
  const seen = new Set()
  return [...ledger, ...withdrawals]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .filter((row) => {
      const key = `${row.title}|${row.amount}|${row.created_at}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

function renderWalletView(view, data) {
  const wallet = data.wallet || {}
  const rows = transactionRows(data)
  view.dataset.gcWalletAdcash = '1'
  view.innerHTML = `
    <div class="gc-wallet-page">
      <section class="gc-wallet-hero">
        <div class="gc-wallet-balance-copy">
          <span>Số dư khả dụng</span>
          <strong>${f(wallet.balance)}<em>coin</em></strong>
          <small>Tổng thu nhập: ${f(wallet.lifetime_earned)} coin</small>
        </div>
        <button class="gc-wallet-withdraw" id="gc-wallet-withdraw">${walletIcon}<span>Rút tiền</span></button>
      </section>

      <section class="gc-wallet-section">
        <div class="gc-wallet-section-head">
          <div><small>DÒNG TIỀN</small><h2>Lịch sử giao dịch</h2></div>
          <span class="gc-wallet-count">${rows.length} giao dịch</span>
        </div>
        <div class="gc-transaction-list">
          ${rows.length ? rows.map((row) => {
            const out = row.amount < 0
            return `<div class="gc-transaction-row">
              <div class="gc-transaction-icon ${out ? 'out' : ''}">${out ? outIcon : inIcon}</div>
              <div class="gc-transaction-copy"><strong>${e(row.title)}</strong><span>${e(row.status)}</span></div>
              <div class="gc-transaction-right"><strong class="${out ? 'negative' : 'positive'}">${out ? '-' : '+'}${f(Math.abs(row.amount))} coin</strong><span>${e(dateText(row.created_at))}</span></div>
            </div>`
          }).join('') : '<div class="gc-wallet-empty">Chưa có giao dịch.</div>'}
        </div>
      </section>
    </div>`

  view.querySelector('#gc-wallet-withdraw')?.addEventListener('click', () => renderWithdrawView(view, data))
}

function renderWithdrawView(view, data) {
  const wallet = data.wallet || {}
  const minimum = Number(data.settings?.min_withdrawal_coin || 20000)
  const pending = (data.withdrawals || []).filter((x) => x.status === 'pending').length
  view.dataset.gcWalletAdcash = 'withdraw'
  view.innerHTML = `
    <div class="gc-withdraw-page">
      <div class="gc-withdraw-top">
        <button class="gc-withdraw-back" id="gc-withdraw-back" aria-label="Quay lại">‹</button>
        <div class="gc-withdraw-title"><small>YÊU CẦU THANH TOÁN</small><h1>Rút tiền</h1></div>
      </div>
      <div class="gc-withdraw-layout">
        <section class="gc-withdraw-card">
          <h2>Thông tin nhận tiền</h2>
          <form id="gc-withdraw-form">
            <span class="gc-field-label">Phương thức</span>
            <div class="gc-method-grid">
              <button type="button" class="selected" data-method="momo"><span class="gc-method-logo momo">M</span><span><strong>MoMo</strong><small>Ví điện tử</small></span></button>
              <button type="button" data-method="bank"><span class="gc-method-logo">${walletIcon}</span><span><strong>Ngân hàng</strong><small>Chuyển khoản</small></span></button>
            </div>
            <input type="hidden" name="method" value="momo">
            <label class="gc-field-label">Chủ tài khoản</label>
            <input name="name" required placeholder="Tên người nhận">
            <label class="gc-field-label" id="gc-destination-label">Số điện thoại MoMo</label>
            <input name="number" required placeholder="09xxxxxxxx" id="gc-destination-input">
            <div id="gc-bank-wrap" hidden><label class="gc-field-label">Tên ngân hàng</label><input name="bank" placeholder="Ví dụ: MB Bank"></div>
            <label class="gc-field-label">Số coin muốn rút</label>
            <input name="amount" type="number" min="${minimum}" required placeholder="Tối thiểu ${f(minimum)} coin">
            <div class="gc-preset-row">
              ${[minimum, minimum * 2, minimum * 5].map((v) => `<button type="button" data-preset="${v}">${f(v)} coin</button>`).join('')}
            </div>
            <button class="gc-submit-withdraw" type="submit">Gửi yêu cầu rút tiền ›</button>
            <p class="gc-form-note">Yêu cầu sẽ được gửi tới Admin để kiểm tra và xử lý.</p>
          </form>
        </section>
        <aside class="gc-withdraw-summary">
          <div class="gc-summary-balance"><span>Số dư hiện tại</span><strong>${f(wallet.balance)} coin</strong></div>
          <div class="gc-summary-line"><span>Mức rút tối thiểu</span><strong>${f(minimum)} coin</strong></div>
          <div class="gc-summary-line"><span>Đang chờ xử lý</span><strong>${pending}</strong></div>
        </aside>
      </div>
    </div>`

  view.querySelector('#gc-withdraw-back')?.addEventListener('click', () => renderWalletView(view, data))
  const hiddenMethod = view.querySelector('input[name="method"]')
  const bankWrap = view.querySelector('#gc-bank-wrap')
  const label = view.querySelector('#gc-destination-label')
  const input = view.querySelector('#gc-destination-input')
  view.querySelectorAll('[data-method]').forEach((button) => {
    button.addEventListener('click', () => {
      view.querySelectorAll('[data-method]').forEach((b) => b.classList.toggle('selected', b === button))
      const method = button.dataset.method
      hiddenMethod.value = method
      bankWrap.hidden = method !== 'bank'
      label.textContent = method === 'bank' ? 'Số tài khoản' : 'Số điện thoại MoMo'
      input.placeholder = method === 'bank' ? '0123456789' : '09xxxxxxxx'
    })
  })
  view.querySelectorAll('[data-preset]').forEach((button) => {
    button.addEventListener('click', () => { view.querySelector('input[name="amount"]').value = button.dataset.preset })
  })
  view.querySelector('#gc-withdraw-form')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const submit = view.querySelector('.gc-submit-withdraw')
    const form = new FormData(event.currentTarget)
    submit.disabled = true
    submit.textContent = 'Đang gửi...'
    try {
      await api('withdraw', {
        coin_amount: Number(form.get('amount')),
        method: form.get('method'),
        account_name: form.get('name'),
        account_number: form.get('number'),
        bank_name: form.get('bank'),
      })
      toast('Đã gửi yêu cầu rút tiền.', 'ok')
      cached = await api('dashboard')
      renderWalletView(view, cached)
    } catch (error) {
      toast(error?.message || 'Không gửi được yêu cầu rút tiền.', 'bad')
      submit.disabled = false
      submit.textContent = 'Gửi yêu cầu rút tiền ›'
    }
  })
}

function queueRaceGuard() {
  for (const delay of [0, 80, 250, 700]) {
    window.setTimeout(() => {
      if (!activeWallet()) return
      const view = document.querySelector('#view')
      if (view && !walletViewIsCurrent(view)) schedule()
    }, delay)
  }
}

async function installWallet(force = false) {
  if (!activeWallet() || rendering) return
  const view = document.querySelector('#view')
  if (!view || (!force && walletViewIsCurrent(view))) return

  rendering = true
  try {
    // Nếu ví cũ vừa được app chính render lại, thay nó ngay bằng ví mới đã cache
    // trước khi gọi server. Như vậy người dùng không còn thấy form ví cũ nhấp nháy.
    if (cached) renderWalletView(view, cached)
    else view.innerHTML = '<div class="loader"></div>'

    const data = await loadWallet(true)
    if (!activeWallet() || !document.body.contains(view)) return
    renderWalletView(view, data)
  } catch (error) {
    if (activeWallet() && document.body.contains(view)) {
      view.innerHTML = `<section class="card center"><h3>Không tải được Ví</h3><p>${e(error?.message || 'Hãy thử lại.')}</p></section>`
      delete view.dataset.gcWalletAdcash
    }
  } finally {
    rendering = false
    queueRaceGuard()
  }
}

export function openWallet(view = document.querySelector('#view')) {
  if (!view) return Promise.resolve()

  // App chính gọi trực tiếp renderer hiện tại. Không render HTML ví cũ trước rồi
  // mới ghi đè, nên chuyển tab Ví không còn bị nháy giao diện cũ.
  if (cached) renderWalletView(view, cached)
  else {
    view.dataset.gcWalletAdcash = 'loading'
    view.innerHTML = '<div class="loader"></div>'
  }

  return installWallet(true)
}

function schedule() {
  if (queued) return
  queued = true
  queueMicrotask(() => {
    queued = false
    installWallet()
  })
}

new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true })
window.addEventListener('pageshow', schedule)
schedule()
