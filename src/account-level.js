export const LEVEL_BASE_COIN = 10_000

export function levelThreshold(level) {
  const safeLevel = Math.max(0, Math.floor(Number(level) || 0))
  return LEVEL_BASE_COIN * safeLevel * (safeLevel + 1) / 2
}

export function getAccountLevel(totalEarned) {
  const earned = Math.max(0, Math.floor(Number(totalEarned) || 0))
  let level = Math.max(0, Math.floor((Math.sqrt(1 + (8 * earned / LEVEL_BASE_COIN)) - 1) / 2))

  while (levelThreshold(level + 1) <= earned) level += 1
  while (level > 0 && levelThreshold(level) > earned) level -= 1

  const currentThreshold = levelThreshold(level)
  const nextThreshold = levelThreshold(level + 1)
  const levelSpan = Math.max(1, nextThreshold - currentThreshold)
  const progress = Math.min(100, Math.max(0, ((earned - currentThreshold) / levelSpan) * 100))

  return {
    earned,
    level,
    currentThreshold,
    nextThreshold,
    remaining: Math.max(0, nextThreshold - earned),
    progress
  }
}
