import './profile-header.css'
import { supabase } from './api.js'

let avatarUrl = null
let avatarLoaded = false
let avatarPromise = null
let queued = false

const bellIcon = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M18 8.8a6 6 0 0 0-12 0c0 7-3 7.2-3 8.7h18c0-1.5-3-1.7-3-8.7Z"/>
    <path d="M9.7 20a2.5 2.5 0 0 0 4.6 0"/>
  </svg>`

function getAvatarUrl() {
  if (avatarLoaded) return Promise.resolve(avatarUrl)
  if (avatarPromise) return avatarPromise

  avatarPromise = supabase.auth.getUser()
    .then(({ data }) => {
      const metadata = data?.user?.user_metadata || {}
      avatarUrl = metadata.avatar_url || metadata.picture || null
      avatarLoaded = true
      return avatarUrl
    })
    .catch(() => {
      avatarLoaded = true
      avatarUrl = null
      return null
    })

  return avatarPromise
}

function openProfile() {
  const accountButton = document.querySelector('.shell>nav [data-tab="account"]')
  if (accountButton) accountButton.click()
}

function closeNotifications() {
  document.querySelectorAll('.gc-notification-popover').forEach((node) => node.remove())
  document.querySelectorAll('.gc-notification-button[aria-expanded="true"]').forEach((button) => {
    button.setAttribute('aria-expanded', 'false')
  })
}

function toggleNotifications(button) {
  const header = button.closest('header')
  if (!header) return

  const current = header.querySelector('.gc-notification-popover')
  if (current) {
    closeNotifications()
    return
  }

  closeNotifications()
  const popover = document.createElement('div')
  popover.className = 'gc-notification-popover'
  popover.innerHTML = `
    <div class="gc-notification-head">
      <strong>Thông báo</strong>
      <span>Gamezcoin</span>
    </div>
    <div class="gc-notification-empty">
      <span class="gc-notification-empty-icon">${bellIcon}</span>
      <div>
        <strong>Chưa có thông báo mới</strong>
        <p>Thông báo về coin, rút tiền và tài khoản sẽ xuất hiện tại đây.</p>
      </div>
    </div>`
  header.append(popover)
  button.setAttribute('aria-expanded', 'true')
}

async function hydrateAvatar(container, initial) {
  const url = await getAvatarUrl()
  if (!container.isConnected) return

  const avatar = container.querySelector('.gc-header-avatar')
  if (!avatar) return

  if (url) {
    avatar.innerHTML = `<img src="${url.replace(/"/g, '&quot;')}" alt="My Profile" referrerpolicy="no-referrer">`
    avatar.classList.add('has-image')
  } else {
    avatar.textContent = initial
    avatar.classList.remove('has-image')
  }
}

function syncHeader() {
  const header = document.querySelector('.shell>header')
  if (!header) return
  if (header.querySelector(':scope > .gc-header-actions')) return

  const oldIdentity = header.firstElementChild
  if (!oldIdentity || oldIdentity.classList.contains('balance')) return

  const displayName = oldIdentity.querySelector('strong')?.textContent?.trim() || 'Người chơi'
  const initial = (displayName[0] || 'G').toUpperCase()

  const actions = document.createElement('div')
  actions.className = 'gc-header-actions'
  actions.innerHTML = `
    <button class="gc-profile-button" type="button" aria-label="Mở My Profile" title="My Profile">
      <span class="gc-header-avatar">${initial}</span>
    </button>
    <button class="gc-notification-button" type="button" aria-label="Thông báo" title="Thông báo" aria-expanded="false">
      ${bellIcon}
    </button>`

  oldIdentity.replaceWith(actions)
  actions.querySelector('.gc-profile-button').addEventListener('click', openProfile)
  actions.querySelector('.gc-notification-button').addEventListener('click', (event) => {
    event.stopPropagation()
    toggleNotifications(event.currentTarget)
  })

  hydrateAvatar(actions, initial)
}

function syncAccountAvatar() {
  const accountAvatar = document.querySelector('#view .avatar')
  if (!accountAvatar || accountAvatar.dataset.gcAvatarSync === '1') return
  accountAvatar.dataset.gcAvatarSync = '1'
  const fallback = (accountAvatar.textContent?.trim() || 'G')[0].toUpperCase()
  getAvatarUrl().then((url) => {
    if (!url || !accountAvatar.isConnected) return
    accountAvatar.innerHTML = `<img src="${url.replace(/"/g, '&quot;')}" alt="My Profile" referrerpolicy="no-referrer">`
    accountAvatar.classList.add('gc-account-avatar-image')
  }).catch(() => {
    accountAvatar.textContent = fallback
  })
}

function sync() {
  syncHeader()
  syncAccountAvatar()
}

function schedule() {
  if (queued) return
  queued = true
  queueMicrotask(() => {
    queued = false
    sync()
  })
}

new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true })
window.addEventListener('pageshow', schedule)
document.addEventListener('click', (event) => {
  if (!event.target.closest('.gc-notification-button') && !event.target.closest('.gc-notification-popover')) {
    closeNotifications()
  }
})
schedule()
