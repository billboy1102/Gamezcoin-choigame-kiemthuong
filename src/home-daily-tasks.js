import './home-daily-tasks.css'

const icons = {
  calendar: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/><path d="M8 14h3M8 17h5"/></svg>',
  gamepad: '<svg viewBox="0 0 24 24"><path d="M7.2 8h9.6a4.2 4.2 0 0 1 4 5.5l-1.2 3.8a2.3 2.3 0 0 1-3.7 1.1l-2-1.7h-3.8l-2 1.7a2.3 2.3 0 0 1-3.7-1.1l-1.2-3.8A4.2 4.2 0 0 1 7.2 8Z"/><path d="M7 12h4M9 10v4M16.5 11.5h.01M18.5 13.5h.01"/></svg>',
  trophy: '<svg viewBox="0 0 24 24"><path d="M8 4h8v4c0 4-1.5 7-4 7s-4-3-4-7V4Z"/><path d="M8 6H4v2c0 3 2 5 5 5M16 6h4v2c0 3-2 5-5 5M12 15v4M8 21h8"/></svg>',
  share: '<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.5-4.3M8.2 13.2l7.5 4.3"/></svg>',
  chevron: '<svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg>'
}

const tasks = [
  { icon: 'gamepad', tone: 'cyan', title: 'Chơi 1 game bất kỳ', reward: '+20 coin', progress: '0/1', tab: 'checkin' },
  { icon: 'gamepad', tone: 'blue', title: 'Chơi 3 game bất kỳ', reward: '+50 coin', progress: '0/3', tab: 'checkin' },
  { icon: 'trophy', tone: 'gold', title: 'Thắng 1 ván game', reward: '+80 coin', progress: '0/1', tab: 'checkin' },
  { icon: 'share', tone: 'purple', title: 'Chia sẻ app cho bạn bè', reward: '+30 coin', progress: '0/1', tab: 'ref' }
]

function goTo(tab) {
  document.querySelector(`.shell>nav [data-tab="${tab}"]`)?.click()
}

function taskRow(task) {
  return `<button type="button" class="gc-daily-task-row" data-daily-task-tab="${task.tab}">
    <i class="gc-daily-task-icon ${task.tone}">${icons[task.icon]}</i>
    <strong>${task.title}</strong>
    <span class="gc-daily-task-reward">${task.reward}</span>
    <em>${task.progress}</em>
    <b>${icons.chevron}</b>
  </button>`
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
      <span>4 nhiệm vụ</span>
    </div>
    <div class="gc-daily-task-list">${tasks.map(taskRow).join('')}</div>
    <button type="button" class="gc-daily-task-all" id="gc-daily-task-all">Xem tất cả nhiệm vụ ${icons.chevron}</button>`

  shortcuts.insertAdjacentElement('afterend', section)

  section.querySelectorAll('[data-daily-task-tab]').forEach((button) => {
    button.addEventListener('click', () => goTo(button.dataset.dailyTaskTab))
  })
  section.querySelector('#gc-daily-task-all')?.addEventListener('click', () => goTo('checkin'))
}

function focusTasks() {
  mountTasks()
  const section = document.querySelector('.gc-premium-daily-tasks')
  if (!section) return false
  section.scrollIntoView({ behavior: 'smooth', block: 'center' })
  section.classList.remove('is-highlighted')
  requestAnimationFrame(() => section.classList.add('is-highlighted'))
  setTimeout(() => section.classList.remove('is-highlighted'), 850)
  return true
}

document.addEventListener('click', (event) => {
  if (!event.target.closest('#gc-premium-task')) return
  if (!document.querySelector('.gc-premium-home')) return
  event.preventDefault()
  event.stopImmediatePropagation()
  focusTasks()
}, true)

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
