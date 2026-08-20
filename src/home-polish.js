import './home-polish.css'

let queued = false

function polishHome() {
  const title = document.querySelector('.gc-premium-section-title h2')
  if (title && title.textContent !== 'Chơi game kiến tiền') {
    title.textContent = 'Chơi game kiến tiền'
  }

  document.querySelectorAll('.shell>header.gc-premium-header').forEach((header) => {
    const user = header.querySelector('.gc-premium-user')
    const bell = header.querySelector('.gc-premium-bell')
    const greeting = header.querySelector('.gc-premium-greeting')
    if (!user || !bell || !greeting) return
    if (bell.parentElement !== user) greeting.insertAdjacentElement('afterend', bell)
  })
}

function schedule() {
  if (queued) return
  queued = true
  queueMicrotask(() => {
    queued = false
    polishHome()
  })
}

new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true })
window.addEventListener('pageshow', schedule)
schedule()
