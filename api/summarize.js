// api/summarize.js
// Uses Google Gemini 2.0 Flash (free tier via AI Studio)
// API key stored as GEMINI_API_KEY in Vercel environment variables

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { channel, texts, language = 'en' } = req.body;

  if (!texts || !Array.isArray(texts) || texts.length === 0) {
    return res.status(400).json({ error: 'texts array is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'AI summarization not configured (no GEMINI_API_KEY)' });
  }

  const combinedText = texts.join('\n\n---\n\n').slice(0, 8000); // stay within limits

  const prompt = `You are a news summarizer. Below are recent posts from the Telegram channel "${channel}".
Summarize the key stories and topics covered in 3-5 bullet points.
Be concise. Each bullet should be one sentence.
Respond in the same language as the posts (auto-detect).
Do not add any intro or outro — just the bullets.

Posts:
${combinedText}`;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 400,
            temperature: 0.3,
          }
        })
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini error:', errText);
      return res.status(502).json({ error: 'AI service error', details: errText });
    }

    const data = await geminiRes.json();
    const summary = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return res.status(200).json({ channel, summary, generatedAt: new Date().toISOString() });

  } catch (err) {
    console.error('Summarize error:', err);
    return res.status(500).json({ error: 'Failed to generate summary', details: err.message });
  }
}
