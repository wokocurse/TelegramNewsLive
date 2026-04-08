const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 8000); // 8 sec timeout

let geminiRes;

try {
  geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 300,
          temperature: 0.3,
        }
      }),
      signal: controller.signal
    }
  );
} catch (err) {
  clearTimeout(timeout);
  console.error('Fetch failed:', err);
  return res.status(200).json({
    summary: '⚠️ AI temporarily unavailable (network error)'
  });
}

clearTimeout(timeout);

if (!geminiRes.ok) {
  const errText = await geminiRes.text();
  console.error('Gemini error:', errText);

  return res.status(200).json({
    summary: '⚠️ AI temporarily unavailable (API error)'
  });
}

let data;

try {
  data = await geminiRes.json();
} catch {
  return res.status(200).json({
    summary: '⚠️ AI response invalid'
  });
}

const summary = data?.candidates?.[0]?.content?.parts?.[0]?.text;

return res.status(200).json({
  channel,
  summary: summary || '⚠️ Empty AI response',
  generatedAt: new Date().toISOString()
});
