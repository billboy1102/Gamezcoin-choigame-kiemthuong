const BLOCK_BLAST_ID = 'block-blast'

function blockBlastButton(target) {
  return target?.closest?.(`[data-play="${BLOCK_BLAST_ID}"]`) || null
}

// Keep Block Blast completely out of the startup path. The module (and its CSS)
// is downloaded only after the player taps Chơi.
document.addEventListener('click', async (event) => {
  const button = blockBlastButton(event.target)
  if (!button || button.dataset.blockBlastInternal === '1') return

  // Stop main.js before it can route block-blast to the legacy memory-game fallback.
  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()

  const oldText = button.textContent
  button.disabled = true
  button.textContent = 'Đang mở...'

  try {
    await import('./block-blast.js')

    button.disabled = false
    button.textContent = oldText

    // Launch through a temporary internal trigger that has no main.js onclick.
    // block-blast.js catches this at document level and starts the correct game.
    const trigger = document.createElement('button')
    trigger.type = 'button'
    trigger.hidden = true
    trigger.dataset.play = BLOCK_BLAST_ID
    trigger.dataset.blockBlastInternal = '1'
    document.body.append(trigger)
    trigger.click()
    trigger.remove()
  } catch (error) {
    console.error('Block Blast lazy-load failed', error)
    button.disabled = false
    button.textContent = oldText
    alert('Không thể mở Block Blast. Hãy thử lại.')
  }
}, true)
