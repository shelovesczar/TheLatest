const fs = require('fs');
const path = require('path');

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

let localEnvCache = null;

function readLocalEnvValue(name = '') {
  if (localEnvCache === null) {
    localEnvCache = {};
    const candidatePaths = [
      path.resolve(process.cwd(), '.env'),
      path.resolve(__dirname, '..', '..', '.env')
    ];

    for (const envPath of candidatePaths) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        content
          .split(/\r?\n/)
          .filter(Boolean)
          .forEach((line) => {
            const trimmed = String(line || '').trim();
            if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) return;
            const separatorIndex = trimmed.indexOf('=');
            const key = trimmed.slice(0, separatorIndex).trim();
            const value = trimmed.slice(separatorIndex + 1).trim();
            if (key) {
              localEnvCache[key] = value;
            }
          });

        break;
      } catch {
        // try the next candidate path
      }
    }
  }

  return String(localEnvCache[name] || '').trim();
}

function getConfigValue(name = '') {
  const localValue = readLocalEnvValue(name);
  if (localValue) return localValue;
  return String(process.env[name] || '').trim();
}

function extractAnthropicTextBlocks(payload) {
  const blocks = Array.isArray(payload?.content) ? payload.content : [];
  return blocks
    .filter((block) => block?.type === 'text' && typeof block?.text === 'string')
    .map((block) => block.text)
    .join('\n')
    .trim();
}

function jsonHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };
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
  const apiKey = getConfigValue('ANTHROPIC_API_KEY');
  if (!apiKey || !headline) return null;

  const model = getConfigValue('ANTHROPIC_PERSPECTIVE_MODEL') || 'claude-haiku-4-5';
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
    const text = extractAnthropicTextBlocks(payload);
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

exports.handler = async (event) => {
  const headers = jsonHeaders();

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { headline = '', source = '' } = event.queryStringParameters || {};
    if (!String(headline || '').trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing headline query parameter' })
      };
    }

    const perspective = await labelStoryPerspective({ headline, source });
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        headline,
        source,
        perspectiveKey: perspective.key,
        perspectiveLabel: perspective.label,
        perspectiveStyle: perspective.sourceStyle
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Unknown error' })
    };
  }
};

module.exports = {
  DISPLAY_MAP,
  labelStoryPerspective,
  handler: exports.handler
};