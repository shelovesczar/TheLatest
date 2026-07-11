export function getGeneratedContentLabel(article = {}) {
  if (!article || typeof article !== 'object') return ''

  if (article.generatedId || article.isGenerated) {
    return article.fallbackLabel || 'AI briefing'
  }

  const url = String(article.url || article.link || '').toLowerCase()
  if (url.includes('fallback.thelatest.local/generated/')) {
    return article.fallbackLabel || 'AI briefing'
  }

  return ''
}