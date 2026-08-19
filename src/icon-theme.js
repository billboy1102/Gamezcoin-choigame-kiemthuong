import './icon-theme.css'
import orbitLogoUrl from './assets/orbit-break-logo.jpg'

const svg = {
  home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 10.5 12 3.8l8.5 6.7v9.2a1.3 1.3 0 0 1-1.3 1.3H4.8a1.3 1.3 0 0 1-1.3-1.3z"/><path d="M9 21v-6.2h6V21"/></svg>',
  rewards: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 1.3 4.2L17.5 8.5l-4.2 1.3L12 14l-1.3-4.2-4.2-1.3 4.2-1.3z"/><path d="m18.5 13 .8 2.4 2.4.8-2.4.8-.8 2.4-.8-2.4-2.4-.8 2.4-.8zM5.2 14.2l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/></svg>',
  wallet: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5h15.2A1.8 1.8 0 0 1 21 9.3v8.9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12"/><path d="M3 8h17.5M16 14h5"/><circle cx="16.6" cy="14" r=".8"/></svg>',
  users: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 20v-1.7A4.8 4.8 0 0 1 8.3 13.5h1.4a4.8 4.8 0 0 1 4.8 4.8V20"/><path d="M15 5.4a3 3 0 0 1 0 5.6M16.4 13.7a4.5 4.5 0 0 1 4.1 4.5V20"/></svg>',
  account: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7.5" r="4"/><path d="M4.5 21v-1.7a6.4 6.4 0 0 1 6.4-6.4h2.2a6.4 6.4 0 0 1 6.4 6.4V21"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5.5" width="18" height="15.5" rx="2.5"/><path d="M7 3v5M17 3v5M3 10h18"/><path d="M7.5 14h.01M12 14h.01M16.5 14h.01M7.5 17.5h.01M12 17.5h.01"/></svg>',
  blocks: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  orbit: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="9" ry="4.2" transform="rotate(35 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="4.2" transform="rotate(-35 12 12)"/><circle cx="18.4" cy="8.1" r="1" class="solid-dot"/></svg>',
  shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 6v5.6c0 4.6-3.1 7.7-8 9.4-4.9-1.7-8-4.8-8-9.4V6z"/><path d="m8.7 12 2.1 2.1 4.6-4.6"/></svg>'
}

const navMap = {
  games: ['home', '🏠'],
  checkin: ['rewards', '🎮'],
  wallet: ['wallet', '🪙'],
  ref: ['users', '👥'],
  account: ['account', '👤']
}

function iconMarkup(name, legacyText = '') {
  return `<span class="gc-line-icon">${svg[name] || ''}</span>${legacyText ? `<span class="gc-icon-legacy">${legacyText}</span>` : ''}`
}

function styleNavIcons() {
  document.querySelectorAll('.shell>nav [data-tab]').forEach((button) => {
    const config = navMap[button.dataset.tab]
    const holder = button.querySelector('b')
    if (!config || !holder) return
    const [name, legacy] = config
    if (holder.dataset.gcIcon === name) return
    holder.dataset.gcIcon = name
    holder.innerHTML = iconMarkup(name, legacy)
  })
}

function styleHomeIcons() {
  document.querySelectorAll('.home-section-title').forEach((title) => {
    const heading = title.querySelector('h2')?.textContent?.trim().toLowerCase() || ''
    const holder = title.querySelector(':scope > span')
    if (!holder || holder.dataset.gcIcon) return
    const name = heading.includes('điểm danh') ? 'calendar' : heading.includes('giới thiệu') ? 'users' : null
    if (!name) return
    holder.dataset.gcIcon = name
    holder.classList.add('gc-feature-icon')
    holder.innerHTML = iconMarkup(name)
  })

  document.querySelectorAll('.rewards-head > span').forEach((holder) => {
    if (holder.dataset.gcRewardsIcon) return
    holder.dataset.gcRewardsIcon = '1'
    holder.innerHTML = `${iconMarkup('rewards')}<span>KIẾM THƯỞNG</span>`
  })
}

function styleGameIcons() {
  document.querySelectorAll('.block-card').forEach((card) => {
    const holder = card.querySelector('.gi')
    if (!holder) return
    const isOrbit = card.classList.contains('orbit-card') || card.classList.contains('home-orbit-card') || /ORBIT BREAK/i.test(card.textContent || '')

    if (isOrbit) {
      if (holder.dataset.gcGameIcon === 'orbit-logo') return
      holder.dataset.gcGameIcon = 'orbit-logo'
      holder.classList.add('gc-game-icon', 'gc-game-logo')
      holder.innerHTML = `<img src="${orbitLogoUrl}" alt="ORBIT BREAK">`
      return
    }

    if (holder.dataset.gcGameIcon === 'blocks') return
    holder.dataset.gcGameIcon = 'blocks'
    holder.classList.add('gc-game-icon')
    holder.classList.remove('gc-game-logo')
    holder.innerHTML = iconMarkup('blocks')
  })
}

function styleLegacyPageIcons() {
  document.querySelectorAll('.emoji').forEach((holder) => {
    if (holder.dataset.gcIcon) return
    const text = holder.textContent || ''
    const name = text.includes('📅') ? 'calendar' : text.includes('👥') ? 'users' : null
    if (!name) return
    holder.dataset.gcIcon = name
    holder.classList.add('gc-large-icon')
    holder.innerHTML = iconMarkup(name)
  })

  document.querySelectorAll('.adminbtn').forEach((button) => {
    if (button.dataset.gcAdminIcon) return
    if (!button.textContent.includes('Trang quản trị')) return
    button.dataset.gcAdminIcon = '1'
    button.innerHTML = `${iconMarkup('shield')}<span>Trang quản trị</span>`
  })
}

let queued = false
function syncIcons() {
  styleNavIcons()
  styleHomeIcons()
  styleGameIcons()
  styleLegacyPageIcons()
}
function schedule() {
  if (queued) return
  queued = true
  queueMicrotask(() => {
    queued = false
    syncIcons()
  })
}

new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true })
window.addEventListener('pageshow', schedule)
schedule()
