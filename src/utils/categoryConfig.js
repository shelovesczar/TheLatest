export const CATEGORY_CONFIG = {
  'top-stories': {
    title: 'Top Stories',
    newsTitle: 'Top Stories',
    subtitle: 'Breaking news and trending stories from around the world.',
    aiPrompt: "today's top breaking news and trending stories",
    image: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=500&fit=crop',
  },
  'entertainment': {
    title: 'Entertainment',
    newsTitle: 'Top Entertainment Stories',
    subtitle: 'Movies, music, celebrities, and pop culture.',
    aiPrompt: 'entertainment and pop culture news',
    image: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&h=500&fit=crop',
  },
  'sports': {
    title: 'Sports',
    newsTitle: 'Top Sports Stories',
    subtitle: 'Scores, highlights, and sports news from around the globe.',
    aiPrompt: 'sports news and highlights',
    image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&h=500&fit=crop',
  },
  'business-tech': {
    title: 'Business & Tech',
    newsTitle: 'Top Business & Tech Stories',
    subtitle: 'Latest updates in business, technology, and innovation.',
    aiPrompt: 'business and technology news',
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=500&fit=crop',
  },
  'lifestyle': {
    title: 'Lifestyle',
    newsTitle: 'Top Lifestyle Stories',
    subtitle: 'Culture, wellness, travel, and everyday living.',
    aiPrompt: 'lifestyle and wellness news',
    image: 'https://images.unsplash.com/photo-1493857671505-72967e2e2760?w=800&h=500&fit=crop',
  },
  'culture': {
    title: 'Culture',
    newsTitle: 'Top Culture Stories',
    subtitle: 'Arts, books, food, and cultural commentary.',
    aiPrompt: 'culture and arts news',
    image: 'https://images.unsplash.com/photo-1507842217343-583f7270bfed?w=800&h=500&fit=crop',
  },
}

export const getCategoryConfig = (categoryName) => {
  if (!categoryName) {
    return {
      title: 'News',
      newsTitle: 'All News',
      subtitle: 'Live headlines, top stories, and fast-moving updates from across the news cycle.',
    }
  }
  return CATEGORY_CONFIG[categoryName.toLowerCase()] || {
    title: categoryName.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    newsTitle: categoryName.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    subtitle: `Live headlines and updates for ${categoryName.replace(/-/g, ' ')}.`,
  }
}

export const getCategoryNameFormatted = (categoryName) => {
  if (!categoryName) return 'All News'
  const config = getCategoryConfig(categoryName)
  return config.title
}
