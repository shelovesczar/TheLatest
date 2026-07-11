const fs = require('fs');
const path = require('path');

const VALID_KEYS = new Set(['left', 'center', 'right', 'unknown']);
const VALID_CONFIDENCE = new Set(['low', 'medium', 'high']);

const DISPLAY_MAP = {
  left: { key: 'left', label: 'Left-Center', sourceStyle: { background: '#dbeafe', color: '#1e40af' } },
  center: { key: 'center', label: 'Center', sourceStyle: { background: '#d1fae5', color: '#065f46' } },
  right: { key: 'right', label: 'Right-Center', sourceStyle: { background: '#fef3c7', color: '#92400e' } },
  unknown: { key: 'unknown', label: 'Unclassified', sourceStyle: { background: '#e5e7eb', color: '#374151' } }
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

function normalizeConfidence(value = '') {
  const normalized = normalizeText(value);
  return VALID_CONFIDENCE.has(normalized) ? normalized : 'low';
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

function fallbackPerspective({ source = '' } = {}) {
  const sourceText = normalizeText(source);
  const directMatch = Object.entries(SOURCE_LEAN_MAP).find(([name]) => sourceText.includes(name));
  if (directMatch) {
    return {
      key: directMatch[1],
      method: 'source-map',
      confidence: 'medium',
      rationale: `Matched source lean map for ${source || 'known outlet'}.`
    };
  }

  return {
    key: 'unknown',
    method: 'unclassified',
    confidence: 'low',
    rationale: 'No trusted source-map or AI perspective estimate was available.'
  };
}

async function classifyWithAnthropic({ headline = '', description = '', source = '' } = {}) {
  const apiKey = getConfigValue('ANTHROPIC_API_KEY');
  if (!apiKey || (!headline && !description)) return null;

  const model = getConfigValue('ANTHROPIC_PERSPECTIVE_MODEL') || 'claude-haiku-4-5';
  const prompt = `Estimate the political perspective framing of this news item using the source, headline, and summary text. Be cautious: if the signal is weak, return unknown.\n\nSource: ${source || 'Unknown'}\nHeadline: ${headline || 'Unavailable'}\nSummary: ${description || 'Unavailable'}\n\nReturn JSON only in the form {"label":"left|center|right|unknown","confidence":"low|medium|high","rationale":"..."}`;

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
    if (!VALID_KEYS.has(label)) return null;

    return {
      key: label,
      method: 'ai-headline',
      confidence: normalizeConfidence(parsed?.confidence),
      rationale: String(parsed?.rationale || '').trim()
    };
  } catch {
    return null;
  }
}

async function labelStoryPerspective({ headline = '', description = '', source = '' } = {}) {
  const aiPerspective = await classifyWithAnthropic({ headline, description, source });
  const resolved = aiPerspective || fallbackPerspective({ source });
  const display = DISPLAY_MAP[resolved.key] || DISPLAY_MAP.unknown;

  return {
    ...display,
    method: resolved.method || 'unclassified',
    confidence: normalizeConfidence(resolved.confidence),
    rationale: String(resolved.rationale || '').trim(),
    isEstimated: display.key !== 'unknown'
  };
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
    const { headline = '', description = '', source = '' } = event.queryStringParameters || {};
    if (!String(headline || '').trim() && !String(description || '').trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing headline or description query parameter' })
      };
    }

    const perspective = await labelStoryPerspective({ headline, description, source });
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        headline,
        description,
        source,
        perspectiveKey: perspective.key,
        perspectiveLabel: perspective.label,
        perspectiveStyle: perspective.sourceStyle,
        perspectiveMethod: perspective.method,
        perspectiveConfidence: perspective.confidence,
        perspectiveRationale: perspective.rationale,
        perspectiveEstimated: perspective.isEstimated
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