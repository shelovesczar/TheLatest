// AI Service for generating dynamic summaries
// Supports OpenAI, Anthropic Claude, and Perplexity

const AI_PROVIDERS = {
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  PERPLEXITY: 'perplexity'
}

// Configuration - Add your API keys to .env
const CONFIG = {
  provider: import.meta.env.VITE_AI_PROVIDER || AI_PROVIDERS.OPENAI,
  apiKeys: {
    openai: import.meta.env.VITE_OPENAI_API_KEY,
    anthropic: import.meta.env.VITE_ANTHROPIC_API_KEY,
    perplexity: import.meta.env.VITE_PERPLEXITY_API_KEY
  },
  maxTokens: 250,
  temperature: 0.7
}

/**
 * Generate AI summary using OpenAI GPT-4
 */
async function generateOpenAISummary(topic = '') {
  const apiKey = CONFIG.apiKeys.openai
  
  if (!apiKey) {
    console.warn('OpenAI API key not configured')
    return null
  }

  const prompt = topic 
    ? `Provide a concise 150-word summary of the latest news and developments about "${topic}". Focus on the most recent and significant events, trends, and discussions.`
    : `Provide a concise 150-word summary of today's top global news stories across politics, technology, business, culture, and current events.`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a news analyst providing concise, factual summaries of current events. Focus on the most recent developments and keep summaries to exactly 150 words.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: CONFIG.maxTokens,
        temperature: CONFIG.temperature
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    return {
      summary: data.choices[0].message.content,
      provider: 'OpenAI GPT-4',
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('OpenAI API error:', error)
    return null
  }
}

/**
 * Generate AI summary using Anthropic Claude
 */
async function generateClaudeSummary(topic = '') {
  const apiKey = CONFIG.apiKeys.anthropic
  
  if (!apiKey) {
    console.warn('Anthropic API key not configured')
    return null
  }

  const prompt = topic 
    ? `Provide a concise 150-word summary of the latest news and developments about "${topic}". Focus on the most recent and significant events, trends, and discussions.`
    : `Provide a concise 150-word summary of today's top global news stories across politics, technology, business, culture, and current events.`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: CONFIG.maxTokens,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    })

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`)
    }

    const data = await response.json()
    return {
      summary: data.content[0].text,
      provider: 'Claude 3 Sonnet',
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('Anthropic API error:', error)
    return null
  }
}

/**
 * Generate AI summary using Perplexity
 */
async function generatePerplexitySummary(topic = '') {
  const apiKey = CONFIG.apiKeys.perplexity
  
  if (!apiKey) {
    console.warn('Perplexity API key not configured')
    return null
  }

  const prompt = topic 
    ? `Provide a concise 150-word summary of the latest news and developments about "${topic}". Focus on the most recent and significant events.`
    : `Provide a concise 150-word summary of today's top global news stories.`

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'sonar-medium-online',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    })

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`)
    }

    const data = await response.json()
    return {
      summary: data.choices[0].message.content,
      provider: 'Perplexity Sonar',
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('Perplexity API error:', error)
    return null
  }
}

/**
 * Main function to generate AI summary
 * Automatically falls back to next provider if one fails
 */
export async function generateAISummary(topic = '') {
  const providers = [
    { name: AI_PROVIDERS.PERPLEXITY, fn: generatePerplexitySummary },
    { name: AI_PROVIDERS.OPENAI, fn: generateOpenAISummary },
    { name: AI_PROVIDERS.ANTHROPIC, fn: generateClaudeSummary }
  ]

  // Try configured provider first
  const primaryProvider = providers.find(p => p.name === CONFIG.provider)
  if (primaryProvider) {
    const result = await primaryProvider.fn(topic)
    if (result) return result
  }

  // Fallback to other providers
  for (const provider of providers) {
    if (provider.name !== CONFIG.provider) {
      const result = await provider.fn(topic)
      if (result) return result
    }
  }

  // If all AI providers fail, return fallback static summary
  return getFallbackSummary(topic)
}

/**
 * Get cached summary from localStorage
 */
export function getCachedSummary(topic = '') {
  const cacheKey = `ai_summary_${topic || 'general'}`
  const cached = localStorage.getItem(cacheKey)
  
  if (!cached) return null
  
  try {
    const data = JSON.parse(cached)
    const age = Date.now() - new Date(data.timestamp).getTime()
    
    // Cache expires after 1 hour
    if (age < 60 * 60 * 1000) {
      return data
    }
  } catch (error) {
    console.error('Error reading cached summary:', error)
  }
  
  return null
}

/**
 * Cache AI summary to localStorage
 */
export function cacheSummary(topic = '', summaryData) {
  const cacheKey = `ai_summary_${topic || 'general'}`
  try {
    localStorage.setItem(cacheKey, JSON.stringify(summaryData))
  } catch (error) {
    console.error('Error caching summary:', error)
  }
}

/**
 * Fallback summary when AI APIs are unavailable
 */
function getFallbackSummary(topic = '') {
  const generalSummary = "Today's news cycle is dominated by analysis of President Donald Trump's first year back in office, with intense focus on immigration, trade, and sweeping executive actions that are testing relationships with allies and critics alike. Social media is simplifying political polarization while also obsessing over fast-moving pop culture, new record-topping album releases to fan debates about superstar tours and awards."
  
  // Enhanced topic-specific fallback summaries
  const topicSummaries = {
    'epstein': 'The Epstein Files continue to generate intense public interest and scrutiny. Recent document releases have prompted renewed investigations and discussions about accountability, institutional failures, and the broader implications for high-profile figures involved. Legal experts, journalists, and advocates are examining the newly available information to understand the full scope of the case and its impact on ongoing legal proceedings.',
    'epstein files': 'The Epstein Files continue to generate intense public interest and scrutiny. Recent document releases have prompted renewed investigations and discussions about accountability, institutional failures, and the broader implications for high-profile figures involved. Legal experts, journalists, and advocates are examining the newly available information to understand the full scope of the case and its impact on ongoing legal proceedings.',
    'oscars': "The 2026 Oscars season is heating up with fierce competition across all categories. Industry insiders are buzzing about potential nominees, breakthrough performances, and directorial achievements that could reshape the awards landscape. Film critics and audiences alike are debating which productions will earn coveted nominations, while studios mount strategic campaigns to secure recognition for their standout projects in what's shaping up to be a memorable year for cinema.",
    'oscar': "The 2026 Oscars season is heating up with fierce competition across all categories. Industry insiders are buzzing about potential nominees, breakthrough performances, and directorial achievements that could reshape the awards landscape. Film critics and audiences alike are debating which productions will earn coveted nominations, while studios mount strategic campaigns to secure recognition for their standout projects in what's shaping up to be a memorable year for cinema.",
    'ai': 'Artificial Intelligence continues to reshape every sector of society, from healthcare and education to business and creative industries. Recent developments in large language models, computer vision, and autonomous systems are sparking both excitement and concern about the technology\'s rapid advancement. Policymakers, tech leaders, and researchers are engaging in crucial debates about AI safety, regulation, ethical deployment, and ensuring these powerful tools benefit humanity while mitigating potential risks.',
    'artificial intelligence': 'Artificial Intelligence continues to reshape every sector of society, from healthcare and education to business and creative industries. Recent developments in large language models, computer vision, and autonomous systems are sparking both excitement and concern about the technology\'s rapid advancement. Policymakers, tech leaders, and researchers are engaging in crucial debates about AI safety, regulation, ethical deployment, and ensuring these powerful tools benefit humanity while mitigating potential risks.',
    'soccer': 'The global soccer landscape is buzzing with major tournaments, transfer news, and standout performances from top leagues worldwide. Fans are tracking their favorite clubs\' pursuit of silverware while emerging talents capture attention with spectacular displays. From Premier League drama to Champions League heroics, tactical innovations and record-breaking achievements are making headlines. International competitions and qualifiers add another layer of excitement as nations prepare for upcoming major tournaments.',
    'football': 'The global soccer landscape is buzzing with major tournaments, transfer news, and standout performances from top leagues worldwide. Fans are tracking their favorite clubs\' pursuit of silverware while emerging talents capture attention with spectacular displays. From Premier League drama to Champions League heroics, tactical innovations and record-breaking achievements are making headlines. International competitions and qualifiers add another layer of excitement as nations prepare for upcoming major tournaments.',
    'trump': 'President Donald Trump\'s administration continues to dominate headlines with bold policy initiatives and controversial decisions. His approach to immigration, trade relations, and domestic policy is reshaping the political landscape. Critics and supporters remain deeply divided on his executive actions, while analysts assess the long-term implications of his governance style. The administration\'s relationship with Congress, media coverage, and public opinion polls all factor into the ongoing political narrative.',
    'politics': 'The political arena remains highly polarized as major policy debates unfold across key issues. Congressional battles, state-level initiatives, and grassroots movements are shaping the national conversation. Voters are engaging with questions about healthcare, economic policy, social justice, and America\'s role on the global stage. Campaign strategies, polling data, and electoral dynamics are constantly evolving as political figures position themselves for upcoming contests.',
    'technology': 'The technology sector is experiencing rapid transformation with breakthroughs in AI, quantum computing, and sustainable innovation. Major tech companies are unveiling new products while startups disrupt traditional industries. Cybersecurity concerns, data privacy debates, and regulatory challenges are prompting important conversations about the future of digital society. Consumer tech trends, enterprise solutions, and emerging platforms are reshaping how people work, communicate, and interact.',
    'business': 'Global markets are navigating complex economic conditions with central banks adjusting monetary policy amid inflation concerns. Corporate earnings reports reveal shifting consumer behaviors and industry dynamics. Major mergers, acquisitions, and strategic partnerships are reshaping competitive landscapes across sectors. Investors are weighing geopolitical risks, supply chain challenges, and technological disruption while identifying growth opportunities in an evolving business environment.',
    'entertainment': 'The entertainment industry is thriving with blockbuster releases, streaming wars, and viral cultural moments. Music charts reflect diverse tastes as artists break records and push creative boundaries. Television and film productions are experimenting with new storytelling formats while social media amplifies celebrity news and fan engagement. Awards season campaigns, concert tours, and franchise announcements keep audiences captivated and industry insiders buzzing.',
    'movies': 'The film industry is experiencing a creative renaissance with diverse storytelling and groundbreaking cinema. Major studios balance blockbuster franchises with original content while independent films gain recognition at prestigious festivals. Streaming platforms compete with traditional theaters for audience attention. Directors push technical and narrative boundaries, exploring new genres and representation. Movie audiences return to cinemas for immersive experiences while home viewing evolves with premium streaming releases.',
    'sports': 'Sports headlines are dominated by championship pursuits, athlete achievements, and dramatic competitions across major leagues. Teams are making strategic moves through trades and free agency while rookies and veterans deliver memorable performances. Coaching changes, injury updates, and playoff races keep fans engaged. International competitions and Olympic preparations add global dimensions to the sports narrative as athletes push human limits.',
    'health': 'Healthcare developments are addressing pressing public health challenges with new treatments, research breakthroughs, and policy initiatives. Medical professionals are advancing personalized medicine, mental health awareness, and preventive care strategies. Public health officials monitor disease trends, vaccination programs, and wellness initiatives. Innovations in biotechnology, pharmaceutical research, and healthcare delivery are improving patient outcomes and access to quality care.',
    'climate': 'Climate change remains a critical global priority as extreme weather events underscore the urgency of action. Scientists present new research on environmental impacts while policymakers debate mitigation strategies and clean energy transitions. International cooperation, corporate sustainability commitments, and grassroots activism are driving climate initiatives. Technological innovations in renewable energy, carbon capture, and sustainable practices offer hope for addressing the climate crisis.',
    'business-tech': 'Business and technology sectors are converging as digital transformation accelerates across industries. Cloud computing, AI integration, and automation are reshaping business models. Startups are attracting significant venture capital while established companies innovate to stay competitive. Cryptocurrency markets, fintech solutions, and enterprise software developments are changing how businesses operate. Economic indicators and tech stock performance reflect investor confidence in innovation-driven growth.',
    'lifestyle': 'Lifestyle trends are evolving as people prioritize wellness, work-life balance, and personal fulfillment. Health and fitness movements emphasize holistic approaches to wellbeing. Travel is rebounding with new destination trends and sustainable tourism practices gaining traction. Food culture celebrates diverse cuisines and dietary innovations. Home design, fashion, and self-care industries are responding to changing consumer preferences and values in a post-pandemic world.'
  }
  
  const normalizedTopic = topic.toLowerCase().trim()
  
  // Check for exact match or partial match in topic summaries
  let topicSummary = topicSummaries[normalizedTopic]
  
  if (!topicSummary) {
    // Try partial match
    for (const [key, summary] of Object.entries(topicSummaries)) {
      if (normalizedTopic.includes(key) || key.includes(normalizedTopic)) {
        topicSummary = summary
        break
      }
    }
  }
  
  // Fallback to generic topic message if no specific summary found
  if (!topicSummary && topic) {
    topicSummary = `Latest developments regarding ${topic} include ongoing discussions and analysis from various perspectives. Real-time AI analysis will provide more specific insights when API keys are configured.`
  }

  return {
    summary: topicSummary || generalSummary,
    provider: 'Static Fallback',
    timestamp: new Date().toISOString(),
    isFallback: true
  }
}

export default {
  generateAISummary,
  getCachedSummary,
  cacheSummary
}
