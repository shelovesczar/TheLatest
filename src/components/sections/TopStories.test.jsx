import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TopStories from './TopStories'

const sampleStory = {
  title: 'Major vote sets up a midnight deadline in Congress',
  description: 'Lawmakers are racing toward a late-night deadline after days of debate.',
  source: 'NPR',
  author: 'Staff',
  image: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=500&fit=crop',
  url: 'https://www.npr.org/example-story',
  publishedAt: '2026-07-10T12:00:00.000Z'
}

function renderTopStories(props = {}) {
  return render(
    <MemoryRouter>
      <TopStories
        loading={false}
        topStories={[sampleStory, { ...sampleStory, title: 'Markets react to late-night budget talks', url: 'https://www.reuters.com/example-two', source: 'Reuters' }]}
        activeStory={0}
        setActiveStory={() => {}}
        categoryTitle="Politics"
        categoryPath="/category/politics/all-news"
        {...props}
      />
    </MemoryRouter>
  )
}

describe('TopStories perspective guardrails', () => {
  it('falls back to standard top stories when a cluster only has one source', () => {
    renderTopStories({
      defaultPerspectiveView: true,
      showPerspectiveToggle: true,
      sideBySideClusters: [
        {
          id: 'cluster-1',
          topic: 'Housing bill showdown',
          sourceCount: 1,
          comparisonEligible: false,
          sources: [
            {
              ...sampleStory,
              perspectiveKey: 'unknown',
              perspectiveLabel: 'Unclassified',
              perspectiveMethod: 'unclassified',
              perspectiveConfidence: 'low'
            }
          ]
        }
      ]
    })

    expect(screen.getByText('TOP POLITICS STORIES')).toBeTruthy()
    expect(screen.queryByText('Perspective estimates')).toBeNull()
    expect(screen.queryByRole('button', { name: /multiple perspectives/i })).toBeNull()
  })

  it('shows side-by-side perspective mode only for eligible multi-source clusters', () => {
    renderTopStories({
      defaultPerspectiveView: true,
      showPerspectiveToggle: true,
      sideBySideClusters: [
        {
          id: 'cluster-1',
          topic: 'Housing bill showdown',
          sourceCount: 2,
          comparisonEligible: true,
          sources: [
            {
              ...sampleStory,
              perspectiveKey: 'left',
              perspectiveLabel: 'Left-Center',
              perspectiveMethod: 'source-map',
              perspectiveConfidence: 'medium'
            },
            {
              ...sampleStory,
              title: 'Conservatives pressure leadership on final housing vote',
              source: 'Fox News',
              url: 'https://www.foxnews.com/example-story',
              perspectiveKey: 'right',
              perspectiveLabel: 'Right-Center',
              perspectiveMethod: 'source-map',
              perspectiveConfidence: 'medium'
            }
          ]
        }
      ]
    })

    expect(screen.getByText('Perspective estimates')).toBeTruthy()
    expect(screen.getByRole('button', { name: /back to top stories/i })).toBeTruthy()
    expect(screen.getByText('Coverage snapshot')).toBeTruthy()
  })
})