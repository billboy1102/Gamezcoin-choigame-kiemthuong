import './home-daily-tasks.css'
import { api } from './api.js'

const icons = {
  calendar: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/><path d="M8 14h3M8 17h5"/></svg>',
  gamepad: '<svg viewBox="0 0 24 24"><path d="M7.2 8h9.6a4.2 4.2 0 0 1 4 5.5l-1.2 3.8a2.3 2.3 0 0 1-3.7 1.1l-2-1.7h-3.8l-2 1.7a2.3 2.3 0 0 1-3.7-1.1l-1.2-3.8A4.2 4.2 0 0 1 7.2 8Z"/><path d="M7 12h4M9 10v4M16.5 11.5h.01M18.5 13.5h.01"/></svg>',
  share: '<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.5-4.3M8.2 13.2l7.5 4.3"/></svg>',
  chevron: '<svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>'
}

const defaultStatus = {
  play_count: 0,
  play_target: 10,
  play_claimed: false,
  share_claimed: false
}

let taskStatus = { ...defaultStatus }
let statusLoading = null
let lastStatusFetch = 0

const tasks = [
  { id: 'play10', icon: 'gamepad', tone: 'blue', title: 'Chơi 10 game bất kỳ', reward: '+100 coin' },
  { id: 'share', icon: 'share', tone: 'purple', title: 'Chia sẻ app cho bạn bè', reward: '+150 coin' }
]

const f = (value) => new Intl.NumberFormat('vi-VN').format(Number(value || 0))

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

function goTo(tab) {
  document.querySelector(`.shell>nav [data-tab="${tab}"]`)?.click()
}

function completedCount() {
  return Number(!!taskStatus.play_claimed) + Number(!!taskStatus.share_claimed)
}

function progressFor(task) {
  if (task.id === 'play10') return `${Math.min(Number(taskStatus.play_count || 0), 10)}/10`
  return taskStatus.share_claimed ? '1/1' : '0/1'
}

function completeFor(task) {
  return task.id === 'play10' ? !!taskStatus.play_claimed : !!taskStatus.share_claimed
}

function taskRow(task) {
  const complete = completeFor(task)
  return `<button type="button" class="gc-daily-task-row ${complete ? 'is-complete' : ''}" data-daily-task="${task.id}">
    <i class="gc-daily-task-icon ${task.tone}">${icons[task.icon]}</i>
    <strong>${task.title}</strong>
    <span class="gc-daily-task-reward">${task.reward}</span>
    <em>${progressFor(task)}</em>
    <b>${complete ? icons.check : icons.chevron}</b>
  </button>`
}

function bindTaskRows(section) {
  section.querySelector('[data-daily-task="play10"]')?.addEventListener('click', () => goTo('checkin'))
  section.querySelector('[data-daily-task="share"]')?.addEventListener('click', openShareSheet)
}

function renderTaskState() {
  const section = document.querySelector('.gc-premium-daily-tasks')
  if (!section) return
  const badge = section.querySelector('.gc-daily-task-head>span')
  const list = section.querySelector('.gc-daily-task-list')
  if (badge) badge.textContent = `${completedCount()}/2`
  if (list) {
    list.innerHTML = tasks.map(taskRow).join('')
    bindTaskRows(section)
  }
}

function updateVisibleBalance(data) {
  const balance = Number(data?.wallet?.balance || 0)
  const head = document.querySelector('.gc-premium-head-balance strong')
  if (head) head.textContent = f(balance)
  const hero = document.querySelector('.gc-premium-hero-copy h1')
  if (hero) hero.innerHTML = `${f(balance)} <small>coin</small>`
}

async function refreshBalance() {
  try {
    updateVisibleBalance(await api('bootstrap'))
  } catch {}
}

function applyTaskStatus(next, notifyPlayReward = false) {
  if (!next) return
  const wasPlayClaimed = !!taskStatus.play_claimed
  taskStatus = { ...defaultStatus, ...next }
  renderTaskState()
  if (notifyPlayReward && !wasPlayClaimed && taskStatus.play_claimed) {
    toast('+100 coin · Hoàn thành nhiệm vụ chơi 10 game', 'ok')
    void refreshBalance()
  }
}

async function refreshStatus(force = false) {
  const now = Date.now()
  if (!force && now - lastStatusFetch < 1500) return taskStatus
  if (statusLoading) return statusLoading
  statusLoading = api('daily_tasks')
    .then((response) => {
      if (response?.tasks) applyTaskStatus(response.tasks)
      lastStatusFetch = Date.now()
      return taskStatus
    })
    .catch((error) => {
      console.warn('Không tải được tiến độ nhiệm vụ', error)
      return taskStatus
    })
    .finally(() => { statusLoading = null })
  return statusLoading
}

function shareUrl() {
  return `${location.origin}${location.pathname}`
}

function closeShareSheet() {
  document.querySelector('.gc-share-backdrop')?.remove()
}

async function claimShareReward() {
  try {
    const response = await api('claim_daily_task', { task: 'share' })
    if (response?.tasks) applyTaskStatus(response.tasks)
    if (response?.result?.claimed) {
      toast('+150 coin · Chia sẻ app cho bạn bè', 'ok')
      await refreshBalance()
    } else if (response?.result?.already_claimed) {
      toast('Hôm nay bạn đã nhận thưởng chia sẻ.', 'ok')
    }
  } catch (error) {
    toast(error?.message || 'Chưa thể ghi nhận nhiệm vụ chia sẻ.', 'bad')
  }
}

function openSocial(channel) {
  const encoded = encodeURIComponent(shareUrl())
  if (channel === 'facebook') {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encoded}`, '_blank', 'noopener,noreferrer')
    void claimShareReward()
    closeShareSheet()
    return
  }
  if (channel === 'messenger') {
    const opened = window.open(`fb-messenger://share/?link=${encoded}`, '_blank')
    if (!opened) location.href = `fb-messenger://share/?link=${encoded}`
    void claimShareReward()
    closeShareSheet()
  }
}

async function shareNative() {
  const data = {
    title: 'Gamezcoin',
    text: 'Chơi game kiếm tiền cùng mình trên Gamezcoin!',
    url: shareUrl()
  }
  try {
    if (navigator.share) {
      await navigator.share(data)
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(data.url)
      toast('Đã sao chép liên kết để chia sẻ.', 'ok')
    } else {
      window.prompt('Sao chép liên kết Gamezcoin:', data.url)
    }
    await claimShareReward()
    closeShareSheet()
  } catch (error) {
    if (error?.name !== 'AbortError') toast('Không thể mở bảng chia sẻ.', 'bad')
  }
}

function openShareSheet() {
  if (document.querySelector('.gc-share-backdrop')) return
  const backdrop = document.createElement('div')
  backdrop.className = 'gc-share-backdrop'
  backdrop.innerHTML = `
    <section class="gc-share-sheet" role="dialog" aria-modal="true" aria-label="Chia sẻ Gamezcoin">
      <div class="gc-share-handle"></div>
      <div class="gc-share-head">
        <div><strong>Chia sẻ Gamezcoin</strong><span>Chọn nơi bạn muốn chia sẻ</span></div>
        <button type="button" class="gc-share-close" aria-label="Đóng">${icons.close}</button>
      </div>
      <div class="gc-share-options">
        <button type="button" data-share-channel="messenger"><i class="messenger">M</i><span>Messenger</span></button>
        <button type="button" data-share-channel="facebook"><i class="facebook">f</i><span>Facebook</span></button>
        <button type="button" data-share-channel="native"><i class="native">${icons.share}</i><span>Chia sẻ khác</span></button>
      </div>
      <p>Thưởng chia sẻ hôm nay: <b>+150 coin</b></p>
    </section>`
  document.body.append(backdrop)

  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop || event.target.closest('.gc-share-close')) closeShareSheet()
  })
  backdrop.querySelector('[data-share-channel="messenger"]')?.addEventListener('click', () => openSocial('messenger'))
  backdrop.querySelector('[data-share-channel="facebook"]')?.addEventListener('click', () => openSocial('facebook'))
  backdrop.querySelector('[data-share-channel="native"]')?.addEventListener('click', () => void shareNative())
}

function mountTasks() {
  const home = document.querySelector('.gc-premium-home')
  if (!home || home.querySelector('.gc-premium-daily-tasks')) return
  const shortcuts = home.querySelector('.gc-premium-shortcuts')
  if (!shortcuts) return

  const section = document.createElement('section')
  section.className = 'gc-premium-daily-tasks'
  section.id = 'gc-premium-daily-tasks'
  section.innerHTML = `
    <div class="gc-daily-task-head">
      <div>${icons.calendar}<strong>Nhiệm vụ hôm nay</strong></div>
      <span>${completedCount()}/2</span>
    </div>
    <div class="gc-daily-task-list">${tasks.map(taskRow).join('')}</div>
    <button type="button" class="gc-daily-task-all" id="gc-daily-task-all">Xem tất cả nhiệm vụ ${icons.chevron}</button>`

  shortcuts.insertAdjacentElement('afterend', section)
  bindTaskRows(section)
  section.querySelector('#gc-daily-task-all')?.addEventListener('click', () => goTo('checkin'))
  void refreshStatus()
}

function focusTasks() {
  mountTasks()
  const section = document.querySelector('.gc-premium-daily-tasks')
  if (!section) return false
  section.scrollIntoView({ behavior: 'smooth', block: 'center' })
  section.classList.remove('is-highlighted')
  requestAnimationFrame(() => section.classList.add('is-highlighted'))
  setTimeout(() => section.classList.remove('is-highlighted'), 850)
  void refreshStatus(true)
  return true
}

document.addEventListener('click', (event) => {
  if (!event.target.closest('#gc-premium-task')) return
  if (!document.querySelector('.gc-premium-home')) return
  event.preventDefault()
  event.stopImmediatePropagation()
  focusTasks()
}, true)

window.addEventListener('gamezcoin:daily-tasks', (event) => {
  applyTaskStatus(event.detail, true)
})

let queued = false
function schedule() {
  if (queued) return
  queued = true
  queueMicrotask(() => {
    queued = false
    mountTasks()
  })
}

new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true })
window.addEventListener('pageshow', schedule)
schedule()
