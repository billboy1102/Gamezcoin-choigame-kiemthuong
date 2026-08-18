const BLOCK_BLAST_ID = 'block-blast'

function blockBlastButton(target) {
  return target?.closest?.(`[data-play="${BLOCK_BLAST_ID}"]`) || null
}

// Keep Block Blast completely out of the startup path. The module (and its CSS)
// is downloaded only after the player taps Chơi. This avoids the Safari startup
// loop that happened when Block Blast was loaded together with the main app.
document.addEventListener('click', async (event) => {
  if (event.__gamezcoinBlockBlastSynthetic) return

  const button = blockBlastButton(event.target)
  if (!button) return

  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()

  const oldText = button.textContent
  button.disabled = true
  button.textContent = 'Đang mở...'

  try {
    await import('./block-blast.js')

    // block-blast.js owns the game session and gameplay. Re-dispatch one marked
    // click after the lazy module is ready so its existing safe handler starts it.
    button.disabled = false
    button.textContent = oldText
    const synthetic = new MouseEvent('click', { bubbles: true, cancelable: true })
    Object.defineProperty(synthetic, '__gamezcoinBlockBlastSynthetic', { value: true })
    button.dispatchEvent(synthetic)
  } catch (error) {
    console.error('Block Blast lazy-load failed', error)
    button.disabled = false
    button.textContent = oldText
    alert('Không thể mở Block Blast. Hãy thử lại.')
  }
}, true)
