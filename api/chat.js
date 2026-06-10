const PORTFOLIO_CONTEXT = [
  'You are a helpful portfolio assistant for Arunkumar Dharmarajan.',
  'Answer only using this profile information and avoid making up facts.',
  'Profile:',
  '- Senior Frontend Engineer with 20+ years of experience.',
  '- Strong in React.js, TypeScript, JavaScript, Next.js, Redux, performance optimization, micro-frontend architecture.',
  '- Current/major experience: Cognizant Technology Solutions (2010 - Present).',
  '- Focus: frontend architecture, enterprise UI engineering, accessibility, scalable React ecosystems, developer experience.',
  '- Impact highlights: around 40% bundle size reduction and improved delivery speed.',
  '- Notable works include enterprise banking onboarding platform, micro-frontend commerce platform, reusable design system/component library.',
  'If asked something outside this scope, politely say the portfolio does not provide that detail and suggest asking about skills, projects, or experience.'
].join('\n')

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin'
  }
}

function getAllowedOrigin(req) {
  const configured = process.env.ALLOWED_ORIGIN || '*'
  const requestOrigin = req.headers.origin || ''

  if (configured === '*') return '*'
  return requestOrigin === configured ? configured : ''
}

function extractReplyText(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim()
  }

  const blocks = Array.isArray(data?.output) ? data.output : []
  const textParts = []

  blocks.forEach((block) => {
    const content = Array.isArray(block?.content) ? block.content : []
    content.forEach((item) => {
      if (typeof item?.text === 'string' && item.text.trim()) {
        textParts.push(item.text.trim())
      }
    })
  })

  return textParts.join('\n').trim()
}

function isDebugEnabled() {
  return process.env.DEBUG_CHAT_API === '1'
}

function debugLog(...args) {
  if (isDebugEnabled()) {
    console.log('[chat-api]', ...args)
  }
}

module.exports = async function handler(req, res) {
  const requestId = req.headers['x-vercel-id'] || req.headers['x-request-id'] || 'unknown'
  const allowedOrigin = getAllowedOrigin(req)

  debugLog('incoming_request', {
    requestId,
    method: req.method,
    origin: req.headers.origin || '',
    allowedOrigin: allowedOrigin || 'blocked-or-empty'
  })

  if (allowedOrigin) {
    Object.entries(corsHeaders(allowedOrigin)).forEach(([key, value]) => {
      res.setHeader(key, value)
    })
  }

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'Missing OPENAI_API_KEY in Vercel environment.' })
  }

  try {
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : ''
    debugLog('message_received', { requestId, messageLength: message.length })

    if (!message) {
      return res.status(400).json({ error: 'message is required.' })
    }

    if (message.length > 800) {
      return res.status(400).json({ error: 'message is too long (max 800 chars).' })
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        input: [
          {
            role: 'system',
            content: [{ type: 'input_text', text: PORTFOLIO_CONTEXT }]
          },
          {
            role: 'user',
            content: [{ type: 'input_text', text: message }]
          }
        ],
        temperature: 0.4,
        max_output_tokens: 350
      })
    })

    const data = await response.json()
    debugLog('openai_response_meta', {
      requestId,
      ok: response.ok,
      status: response.status,
      model: data?.model || 'unknown',
      hasOutputText: typeof data?.output_text === 'string' && data.output_text.trim().length > 0,
      outputCount: Array.isArray(data?.output) ? data.output.length : 0,
      errorMessage: data?.error?.message || ''
    })

    if (!response.ok) {
      const upstream = data?.error?.message || 'OpenAI request failed.'
      return res.status(502).json({ error: upstream })
    }

    const reply = extractReplyText(data)
    debugLog('reply_extracted', {
      requestId,
      replyLength: reply.length
    })

    if (!reply) {
      return res.status(502).json({ error: 'OpenAI returned an empty response.' })
    }

    return res.status(200).json({ reply })
  } catch (error) {
    console.error('[chat-api] unhandled_error', {
      requestId,
      message: error?.message || 'Unexpected server error.'
    })
    return res.status(500).json({ error: error?.message || 'Unexpected server error.' })
  }
}
