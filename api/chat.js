// api/chat.js — Vercel serverless function
// Usa Groq (gratuito) — chiave in Vercel > Settings > Environment Variables > GROQ_API_KEY

import { PAOLO_PROFILE } from './ai/paolo-profile.js';
import { RESPONSE_POLICY } from './ai/response-policy.js';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM = `
${RESPONSE_POLICY}

PAOLO PROFILE:
${PAOLO_PROFILE}
`;

function toGeminiShape(payload) {
  return {
    candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }]
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { contents: rawContents = [] } = req.body;
    const contents = Array.isArray(rawContents) ? rawContents : [];
    const userQuestionCount = contents.filter(c => c.role === 'user').length;

    if (userQuestionCount > 15) {
      return res.status(200).json(toGeminiShape({
        intent: 'contact',
        display: 'notice',
        chat: 'Paolo has probably said enough through the canvas for now. For a real conversation, it is better to contact him directly at garito.paolo@gmail.com or on LinkedIn.',
        title: 'Contact Paolo',
        paragraphs: ['Paolo has probably said enough through the canvas for now. For a real conversation, it is better to contact him directly at garito.paolo@gmail.com or on LinkedIn.'],
        contactRecommended: true
      }));
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: 'GROQ_API_KEY not set in Vercel environment variables' });
    }

    // Convert Gemini-format history to OpenAI-format messages
    const messages = [
      { role: 'system', content: `${SYSTEM}\n\nThe visitor has asked ${userQuestionCount} question(s) in this session.` },
      ...contents.map(c => ({
        role: c.role === 'model' ? 'assistant' : 'user',
        content: c.parts?.[0]?.text || ''
      }))
    ];

    const groqRes = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.7,
        max_tokens: 700
      })
    });

    if (!groqRes.ok) {
      const err = await groqRes.json().catch(() => ({}));
      return res.status(groqRes.status).json({ error: err?.error?.message || groqRes.statusText });
    }

    const data = await groqRes.json();
    const text = data.choices?.[0]?.message?.content || '{}';

    // Return in the same response shape the frontend already expects.
    return res.status(200).json({
      candidates: [{ content: { parts: [{ text }] } }]
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
