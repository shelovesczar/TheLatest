import { describe, expect, it } from 'vitest'
import { buildStoryHref, buildStorySlug, parseStoryArticleFromSearch, resolveContentHref } from './storyRouting'
import { getGeneratedContentLabel } from './contentLabels'

describe('storyRouting', () => {
  it('builds a stable story slug from article fields', () => {
    const article = {
      title: 'Markets rally after inflation cools',
      source: 'Reuters',
      publishedAt: '2026-06-17T10:00:00Z',
      url: 'https://example.com/story'
    }

    expect(buildStorySlug(article)).toMatch(/^markets-rally-after-inflation-cools-/)
  })

  it('round-trips article metadata through the story query string', () => {
    const href = buildStoryHref({
      title: 'AI fallback overview',
      description: 'Thin coverage path.',
      source: 'The Latest',
      generatedId: 'generated-123',
      fallbackLabel: 'AI fallback',
      contentKind: 'news',
      url: 'https://fallback.thelatest.local/generated/generated-123'
    })

    const parsed = parseStoryArticleFromSearch(href.split('?')[1] ? `?${href.split('?')[1]}` : '')
    expect(parsed.generatedId).toBe('generated-123')
    expect(parsed.fallbackLabel).toBe('AI fallback')
    expect(parsed.title).toBe('AI fallback overview')
  })

  it('routes generated items to the on-site reader', () => {
    const href = resolveContentHref({
      title: 'Generated tech briefing',
      generatedId: 'generated-456',
      url: 'https://fallback.thelatest.local/generated/generated-456'
    })

    expect(href.startsWith('/story/')).toBe(true)
  })

  it('returns explicit labels for generated fallback items', () => {
    expect(getGeneratedContentLabel({ generatedId: 'generated-1', fallbackLabel: 'AI fallback' })).toBe('AI fallback')
    expect(getGeneratedContentLabel({ url: 'https://fallback.thelatest.local/generated/generated-1' })).toBe('AI briefing')
  })
})