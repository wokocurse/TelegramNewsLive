// api/channel.js
// Vercel Serverless Function
// Fetches t.me/s/<channel> and parses the latest post IDs + text snippets
// No Telegram API key needed — uses public preview pages

export default async function handler(req, res) {
  // CORS headers — allow any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { channel, limit = 5 } = req.query;

  if (!channel || !/^[a-zA-Z0-9_]{3,}$/.test(channel)) {
    return res.status(400).json({ error: 'Invalid channel name' });
  }

  const postLimit = Math.min(parseInt(limit) || 5, 20);

  try {
    const url = `https://t.me/s/${channel}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8',
      }
    });

    if (!response.ok) {
      return res.status(502).json({ error: `Telegram returned ${response.status}` });
    }

    const html = await response.text();

    // Extract post IDs from data-post attributes like "topor/49252"
    const postMatches = [...html.matchAll(/data-post="([^"]+)"/g)];
    const postIds = postMatches
      .map(m => {
        const parts = m[1].split('/');
        return parseInt(parts[parts.length - 1]);
      })
      .filter(id => !isNaN(id) && id > 0);

    // Deduplicate and get the latest N
    const uniqueIds = [...new Set(postIds)].sort((a, b) => b - a).slice(0, postLimit);

    // Extract text snippets from the HTML for AI summarization
    const textMatches = [...html.matchAll(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/g)];
    const textSnippets = textMatches
      .map(m => m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
      .filter(t => t.length > 10)
      .slice(0, postLimit);

    // Extract channel info
    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
    const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
    const subscriberMatch = html.match(/(\d[\d\s]*)\s*(?:subscribers|members)/i);

    return res.status(200).json({
      channel,
      title: titleMatch ? titleMatch[1] : channel,
      description: descMatch ? descMatch[1] : '',
      subscribers: subscriberMatch ? subscriberMatch[1].replace(/\s/g, '') : null,
      postIds: uniqueIds,
      textSnippets,
      latestPostId: uniqueIds[0] || null,
      fetchedAt: new Date().toISOString(),
    });

  } catch (err) {
    console.error('Channel fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch channel data', details: err.message });
  }
}
