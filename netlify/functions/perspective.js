const VALID_KEYS = new Set(['left', 'center', 'right']);

const DISPLAY_MAP = {
  left: { key: 'left', label: 'Left-Center', sourceStyle: { background: '#dbeafe', color: '#1e40af' } },
  center: { key: 'center', label: 'Center', sourceStyle: { background: '#d1fae5', color: '#065f46' } },
  right: { key: 'right', label: 'Right-Center', sourceStyle: { background: '#fef3c7', color: '#92400e' } }
};

const SOURCE_LEAN_MAP = {
  'new york times': 'left',
  'the guardian': 'left',
  'guardian': 'left',
  'npr': 'left',
  'washington post': 'left',
  'la times': 'left',
  'cnn': 'left',
  'msnbc': 'left',
  'politico': 'center',
  'associated press': 'center',
  'ap news': 'center',
  'reuters': 'center',
  'bbc news': 'center',
  'bbc': 'center',
  'abc news': 'center',
  'cbs news': 'center',
  'nbc news': 'center',
  'usa today': 'center',
  'wall street journal': 'right',
  'fox news': 'right',
  'new york post': 'right',
  'the hill': 'right',
  'national review': 'right',
  'pj media': 'right'
};

function normalizeText(value = '') {
  return String(value || '').trim().toLowerCase();
}

function fallbackPerspective({ headline = '', source = '' } = {}) {
  const sourceText = normalizeText(source);
  const directMatch = Object.entries(SOURCE_LEAN_MAP).find(([name]) => sourceText.includes(name));
  if (directMatch) {
    return directMatch[1];
  }

  const headlineText = normalizeText(headline);
  if (/opinion|editorial|column|analysis|commentary/.test(headlineText)) {
    return 'center';
  }

  return 'center';
}

async function classifyWithAnthropic({ headline = '', source = '' } = {}) {
  const apiKey = String(process.env.ANTHROPIC_API_KEY || '').trim();
  if (!apiKey || !headline) return null;

  const model = process.env.ANTHROPIC_PERSPECTIVE_MODEL || 'claude-3-5-haiku-latest';
  const prompt = `Classify the political perspective of this headline using only the headline's framing and emphasis.\n\nSource: ${source || 'Unknown'}\nHeadline: ${headline}\n\nReturn JSON only in the form {"label":"left|center|right","rationale":"..."}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: 120,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) return null;

    const payload = await response.json().catch(() => null);
    const text = payload?.content?.[0]?.text || '';
    if (!text) return null;

    const parsed = JSON.parse(String(text).replace(/```json|```/g, '').trim());
    const label = normalizeText(parsed?.label);
    return VALID_KEYS.has(label) ? label : null;
  } catch {
    return null;
  }
}

async function labelStoryPerspective({ headline = '', source = '' } = {}) {
  const aiLabel = await classifyWithAnthropic({ headline, source });
  const key = aiLabel || fallbackPerspective({ headline, source });
  return DISPLAY_MAP[key] || DISPLAY_MAP.center;
}

module.exports = {
  DISPLAY_MAP,
  labelStoryPerspective
};