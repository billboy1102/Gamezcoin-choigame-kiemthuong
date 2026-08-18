const nativeRandom = Math.random.bind(Math)
let gameStartedAt = 0
let lastDifficulty = -1

function difficultyLevel() {
  if (!gameStartedAt) return 0
  const elapsed = (Date.now() - gameStartedAt) / 1000
  if (elapsed < 90) return 0
  if (elapsed < 210) return 1
  if (elapsed < 360) return 2
  return 3
}

function difficultyName(level) {
  return ['Bình thường', 'Khó hơn', 'Khó', 'Rất khó'][level] || 'Bình thường'
}

// app-v2 picks Block Blast shapes with Math.random(). The harder shapes are
// later in its shape list, so progressively biasing random values upward makes
// longer / awkward pieces appear more often as a run gets longer. Outside the
// active play screen the original random function is used untouched.
Math.random = function gamezcoinDifficultyRandom() {
  const inGame = Boolean(document.querySelector('.play-screen'))
  if (!inGame) return nativeRandom()
  const level = difficultyLevel()
  const exponent = [1, 0.78, 0.56, 0.38][level]
  return Math.pow(nativeRandom(), exponent)
}

function syncRewardAndDifficultyUI() {
  const play = document.querySelector('.play-screen')
  if (play && !gameStartedAt) {
    gameStartedAt = Date.now()
    lastDifficulty = -1
  }
  if (!play && !document.querySelector('.play-loading')) {
    gameStartedAt = 0
    lastDifficulty = -1
  }

  const rate = document.querySelector('.block-card em')
  if (rate && rate.textContent.trim() !== '10 điểm = 1 coin') {
    rate.textContent = '10 điểm = 1 coin'
  }

  const card = document.querySelector('.block-card > div:nth-child(2)')
  if (card && !card.querySelector('.block-difficulty-note')) {
    const note = document.createElement('span')
    note.className = 'block-difficulty-note'
    note.textContent = 'Độ khó tăng dần khi chơi lâu'
    note.style.cssText = 'display:block;margin-top:4px;color:#9fb7d2;font-size:10px;font-weight:700'
    card.append(note)
  }

  if (play) {
    const level = difficultyLevel()
    if (level !== lastDifficulty) {
      lastDifficulty = level
      let badge = document.querySelector('.play-difficulty-badge')
      if (!badge) {
        badge = document.createElement('div')
        badge.className = 'play-difficulty-badge'
        badge.style.cssText = 'width:min(92vw,420px);margin:0 auto 6px;text-align:center;color:#eaf1ff;font-size:10px;font-weight:900;letter-spacing:.7px;opacity:.9'
        const board = document.querySelector('#play-board')
        if (board) board.before(badge)
      }
      if (badge) badge.textContent = `ĐỘ KHÓ: ${difficultyName(level).toUpperCase()}`
    }
  }
}

let scheduled = false
function scheduleSync() {
  if (scheduled) return
  scheduled = true
  queueMicrotask(() => {
    scheduled = false
    syncRewardAndDifficultyUI()
  })
}

new MutationObserver(scheduleSync).observe(document.documentElement, { childList: true, subtree: true })
setInterval(syncRewardAndDifficultyUI, 3000)
syncRewardAndDifficultyUI()
