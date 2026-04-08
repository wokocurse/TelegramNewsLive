import * as cheerio from 'cheerio';

// ⚠️ cache оставим, но безопасно
const CACHE = new Map();
const CACHE_TTL = 10000;

export default async function handler(req, res) {
  const { channel, limit = 5 } = req.query;

  if (!channel) {
    return res.status(400).json({ error: 'Missing channel' });
  }

  try {
    const cacheKey = channel;
    const cached = CACHE.get(cacheKey);

    if (cached && Date.now() - cached.time < CACHE_TTL) {
      return res.status(200).json(cached.data);
    }

    const url = `https://t.me/s/${channel}?t=${Date.now()}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Cache-Control': 'no-cache'
      }
    });

    const html = await response.text();
    const $ = cheerio.load(html);

    const posts = [];

    // ✅ БЕРЁМ БОЛЬШЕ (НО НЕ ВСЁ)
    $('.tgme_widget_message').slice(0, 20).each((i, el) => {
      const id = $(el).attr('data-post')?.split('/')[1];
      if (!id) return;

      const text = $(el).find('.tgme_widget_message_text').text().trim();

      const images = [];
      $(el).find('.tgme_widget_message_photo_wrap').each((_, imgEl) => {
        const style = $(imgEl).attr('style');
        const match = style?.match(/url\('(.*?)'\)/);
        if (match) images.push(match[1]);
      });

      const views = $(el).find('.tgme_widget_message_views').text().trim();

      const date = $(el).find('time').attr('datetime');

      const reactions = [];
      $(el).find('.tgme_widget_message_reactions span').each((_, r) => {
        reactions.push($(r).text().trim());
      });

      const channelName = $(el)
        .find('.tgme_widget_message_owner_name')
        .text()
        .trim();

      const avatar = $(el)
        .find('.tgme_widget_message_user_photo img')
        .attr('src');

      posts.push({
        id: Number(id),
        text,
        images,
        views,
        date,
        reactions,
        channelName,
        avatar,
        link: `https://t.me/${channel}/${id}`
      });
    });

    // ✅ СНАЧАЛА СОРТИРОВКА
    posts.sort((a, b) => b.id - a.id);

    // ✅ ПОТОМ ОБРЕЗКА
    const result = {
      posts: posts.slice(0, Number(limit))
    };

    CACHE.set(cacheKey, {
      time: Date.now(),
      data: result
    });

    res.setHeader('Cache-Control', 'no-store');

    return res.status(200).json(result);

  } catch (err) {
    console.error('Channel fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch channel' });
  }
}
