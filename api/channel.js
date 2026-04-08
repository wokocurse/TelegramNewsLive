import * as cheerio from 'cheerio';

// 🔥 GLOBAL CACHE (shared across requests)
const CACHE = new Map();
const CACHE_TTL = 10000; // 10 seconds

export default async function handler(req, res) {
  const { channel, limit = 5 } = req.query;

  if (!channel) {
    return res.status(400).json({ error: 'Missing channel' });
  }

  try {
    const cacheKey = channel;
    const cached = CACHE.get(cacheKey);

    // ✅ RETURN CACHED DATA
    if (cached && Date.now() - cached.time < CACHE_TTL) {
      return res.status(200).json(cached.data);
    }

    const url = `https://t.me/s/${channel}`;

    // ✅ safer request (prevents Telegram blocking)
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    const html = await response.text();
    const $ = cheerio.load(html);

    const posts = [];

    // 🔥 LIMIT PARSING (CRITICAL FOR MEMORY)
    $('.tgme_widget_message').slice(0, 6).each((i, el) => {
      const id = $(el).attr('data-post')?.split('/')[1];
      if (!id) return;

      // 📝 TEXT
      const text = $(el)
        .find('.tgme_widget_message_text')
        .text()
        .trim();

      // 🖼 IMAGES
      const images = [];
      $(el).find('.tgme_widget_message_photo_wrap').each((_, imgEl) => {
        const style = $(imgEl).attr('style');
        const match = style?.match(/url\('(.*?)'\)/);
        if (match) images.push(match[1]);
      });

      // 👁 VIEWS
      const views = $(el)
        .find('.tgme_widget_message_views')
        .text()
        .trim();

      // 🕒 DATE
      const date = $(el)
        .find('time')
        .attr('datetime');

      // 👍 REACTIONS
      const reactions = [];
      $(el).find('.tgme_widget_message_reactions span').each((_, r) => {
        reactions.push($(r).text().trim());
      });

      // 🧑 CHANNEL NAME
      const channelName = $(el)
        .find('.tgme_widget_message_owner_name')
        .text()
        .trim();

      // 🖼 AVATAR
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

    // 🔥 SORT NEWEST → OLDEST (VERY IMPORTANT)
    posts.sort((a, b) => b.id - a.id);

    const result = {
      posts: posts.slice(0, Number(limit))
    };

    // ✅ SAVE TO CACHE
    CACHE.set(cacheKey, {
      time: Date.now(),
      data: result
    });

    return res.status(200).json(result);

  } catch (err) {
    console.error('Channel fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch channel' });
  }
}
